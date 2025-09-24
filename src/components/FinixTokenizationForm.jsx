import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
// Finix uses applicationId + environment (no client publishable key)

const DEFAULT_FINIX_SDK_URL = import.meta.env.VITE_FINIX_SDK_URL || "";
const FINIX_APPLICATION_ID = import.meta.env.VITE_FINIX_APPLICATION_ID || "";
const FINIX_ENVIRONMENT = import.meta.env.VITE_FINIX_ENVIRONMENT || "sandbox";
const FINIX_FRAUD_SDK_URL = import.meta.env.VITE_FINIX_FRAUD_SDK_URL || "";

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(false);
    const existing = document.querySelector(`script[src=\"${src}\"]`);
    if (existing) return resolve(true);
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Finix SDK"));
    document.head.appendChild(script);
  });
}

const FinixTokenizationForm = forwardRef(function FinixTokenizationForm(
  props,
  ref
) {
  const { sdkUrl = DEFAULT_FINIX_SDK_URL, className = "", onReady } = props;
  const formContainerId = "finix-card-form";
  const [isReady, setIsReady] = useState(false);
  const finixInstanceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await loadScriptOnce(sdkUrl);
      } catch {
        // Ignore load failure; we'll fallback to stub tokenization
      }

      // Load fraud SDK if provided
      try {
        await loadScriptOnce(FINIX_FRAUD_SDK_URL);
      } catch {
        // optional
      }

      // Attempt to initialize Finix tokenization form if available
      const finixGlobal = window.Finix || window.finix || null;
      // Configure Auth first if available (some SDKs require this)
      try {
        const Auth = finixGlobal && finixGlobal.Auth;
        if (Auth) {
          if (typeof Auth.configure === "function") {
            Auth.configure({
              applicationId: FINIX_APPLICATION_ID,
              environment: FINIX_ENVIRONMENT,
            });
          } else if (typeof Auth.init === "function") {
            Auth.init({
              applicationId: FINIX_APPLICATION_ID,
              environment: FINIX_ENVIRONMENT,
            });
          } else if (typeof Auth.setup === "function") {
            Auth.setup({
              applicationId: FINIX_APPLICATION_ID,
              environment: FINIX_ENVIRONMENT,
            });
          } else if (typeof Auth === "function") {
            Auth({
              applicationId: FINIX_APPLICATION_ID,
              environment: FINIX_ENVIRONMENT,
            });
          }
        }
      } catch {}
      // Canonical API per docs: CardTokenForm("container-id", options)
      if (finixGlobal && typeof finixGlobal.CardTokenForm === "function") {
        try {
          // Per docs: constructor is CardTokenForm(elementId, options) - NO new keyword
          const instance = finixGlobal.CardTokenForm(formContainerId, {
            showLabels: true,
            showPlaceholders: true,
            showAddress: false, // We collect ZIP separately for AVS
          });

          // Expose for debugging
          window.finixCardForm = instance;

          finixInstanceRef.current = {
            async tokenize() {
              const env = FINIX_ENVIRONMENT;
              const appId = FINIX_APPLICATION_ID;
              if (typeof instance.submit !== "function") {
                throw new Error("Tokenization not available");
              }
              // Per docs: submit(environment, applicationId, callback)
              const res = await new Promise((resolve, reject) => {
                instance.submit(env, appId, (err, data) => {
                  if (err) return reject(err);
                  resolve(data);
                });
              });
              return normalizeToken(res);
            },
          };
          if (!cancelled) {
            setIsReady(true);
            if (typeof onReady === "function") onReady(true);
          }
          return;
        } catch {}
      }
      // If no CardTokenForm, mark ready but tokenization won't work
      if (!cancelled) {
        setIsReady(true);
        if (typeof onReady === "function") onReady(true);
      }
    }
    init();
    return () => {
      cancelled = true;
      finixInstanceRef.current = null;
    };
  }, [sdkUrl]);

  useImperativeHandle(ref, () => ({
    async tokenize() {
      // Prefer real Finix instance if available
      if (
        finixInstanceRef.current &&
        typeof finixInstanceRef.current.tokenize === "function"
      ) {
        const inst = finixInstanceRef.current;
        const primaryOpts = {
          applicationId: FINIX_APPLICATION_ID,
          environment: FINIX_ENVIRONMENT,
        };
        const altOpts1 = {
          application_id: FINIX_APPLICATION_ID,
          environment: FINIX_ENVIRONMENT,
        };
        const altOpts2 = {
          application: FINIX_APPLICATION_ID,
          environment: FINIX_ENVIRONMENT,
        };

        // Try createToken/tokenize/submit with multiple signatures
        const attempts = [
          () => inst.createToken && inst.createToken(primaryOpts),
          () =>
            inst.createToken &&
            inst.createToken(FINIX_APPLICATION_ID, FINIX_ENVIRONMENT),
          () => inst.tokenize && inst.tokenize(primaryOpts),
          () =>
            inst.tokenize &&
            inst.tokenize(FINIX_APPLICATION_ID, FINIX_ENVIRONMENT),
          () => inst.submit && inst.submit(primaryOpts),
          () =>
            inst.submit && inst.submit(FINIX_APPLICATION_ID, FINIX_ENVIRONMENT),
          () => inst.submit && inst.submit(altOpts1),
          () => inst.submit && inst.submit(altOpts2),
        ];

        for (const fn of attempts) {
          try {
            const res = await (fn && fn());
            if (res) return normalizeToken(res);
          } catch (e) {
            // Try next signature
          }
        }
        throw new Error("Tokenization not available");
      }
      // Fallback stub for development if SDK not available
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: `pi_${Math.random().toString(36).slice(2, 12)}`,
            brand: "UNKNOWN",
            last_four: "0000",
          });
        }, 400);
      });
    },
    getFraudSessionId() {
      // Example: if fraud SDK exposes a session id
      const fraud = window.finixFraud || window.FinixFraud || null;
      const id =
        (fraud && (fraud.sessionId?.() || fraud.getSessionId?.())) || undefined;
      return id;
    },
    isReady: () => isReady,
  }));

  return (
    <div className={className}>
      <div className="space-y-3">
        <div
          id={formContainerId}
          className="w-full border rounded-md bg-white p-3 min-h-[44px]"
        />
      </div>
      {(!DEFAULT_FINIX_SDK_URL || !FINIX_APPLICATION_ID) && (
        <p className="mt-2 text-xs text-gray-500">
          Finix tokenization is not fully configured. Define VITE_FINIX_SDK_URL
          and VITE_FINIX_APPLICATION_ID to enable tokenization.
        </p>
      )}
    </div>
  );
});

export default FinixTokenizationForm;

function normalizeToken(res) {
  try {
    if (!res) return { id: undefined, brand: "UNKNOWN", last_four: "0000" };
    // Per Finix docs: response shape is { data: { id: "TK...", ... } }
    const tokenData = res.data || {};
    const token = tokenData.id; // Should be TK-prefixed
    return {
      id: token,
      brand: tokenData.brand || "UNKNOWN",
      last_four: tokenData.last_four || tokenData.lastFour || "0000",
    };
  } catch {
    return { id: undefined, brand: "UNKNOWN", last_four: "0000" };
  }
}
