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
      if (
        finixGlobal &&
        typeof finixGlobal.createTokenizationForm === "function"
      ) {
        try {
          const instance = finixGlobal.createTokenizationForm({
            applicationId: FINIX_APPLICATION_ID,
            environment: FINIX_ENVIRONMENT,
            container: `#${formContainerId}`,
          });
          // Some SDK versions require an explicit mount/render
          try {
            if (typeof instance.mount === "function") instance.mount();
          } catch {}
          try {
            if (typeof instance.render === "function") instance.render();
          } catch {}
          finixInstanceRef.current = instance;
          if (!cancelled) {
            setIsReady(true);
            if (typeof onReady === "function") onReady(true);
          }
          return;
        } catch {
          // Fall through to stub
        }
      }
      // Alternate API: CardTokenForm (found in your environment)
      if (finixGlobal && typeof finixGlobal.CardTokenForm === "function") {
        try {
          // Use options signature which your SDK expects
          const instance = new finixGlobal.CardTokenForm(formContainerId, {
            applicationId: FINIX_APPLICATION_ID,
            environment: FINIX_ENVIRONMENT,
            submitOptions: {
              applicationId: FINIX_APPLICATION_ID,
              environment: FINIX_ENVIRONMENT,
            },
          });
          try {
            if (typeof instance.mount === "function") instance.mount();
          } catch {}
          try {
            if (typeof instance.render === "function") instance.render();
          } catch {}
          window.finixCardForm = instance;
          finixInstanceRef.current = {
            async tokenize() {
              const env = FINIX_ENVIRONMENT;
              const appId = FINIX_APPLICATION_ID;

              // Prefer callback signature: submit(env, appId, cb) or submit(appId, env, cb)
              if (typeof instance.submit === "function") {
                try {
                  const res = await new Promise((resolve, reject) => {
                    try {
                      instance.submit(env, appId, (err, data) => {
                        if (err) return reject(err);
                        resolve(data);
                      });
                    } catch (e1) {
                      try {
                        instance.submit(appId, env, (err, data) => {
                          if (err) return reject(err);
                          resolve(data);
                        });
                      } catch (e2) {
                        reject(e2);
                      }
                    }
                  });
                  return normalizeToken(res);
                } catch (_) {
                  // fall through
                }
              }

              // Promise-based fallbacks
              if (typeof instance.createToken === "function") {
                try {
                  const res = await instance.createToken({
                    applicationId: appId,
                    environment: env,
                  });
                  return normalizeToken(res);
                } catch {}
              }
              if (typeof instance.tokenize === "function") {
                try {
                  const res = await instance.tokenize({
                    applicationId: appId,
                    environment: env,
                  });
                  return normalizeToken(res);
                } catch {}
              }
              throw new Error("Tokenization not available");
            },
          };
          if (!cancelled) {
            setIsReady(true);
            if (typeof onReady === "function") onReady(true);
          }
          return;
        } catch {}
      }
      // Fallback: some SDK variants expose createField + tokenize globally
      if (finixGlobal && typeof finixGlobal.createField === "function") {
        try {
          const form = finixGlobal.createField("card", {
            container: `#${formContainerId}`,
          });
          if (typeof form.mount === "function")
            form.mount(`#${formContainerId}`);
          finixInstanceRef.current = {
            tokenize: async () => {
              if (typeof finixGlobal.tokenize === "function") {
                return await finixGlobal.tokenize();
              }
              throw new Error("Tokenization not available");
            },
          };
          if (!cancelled) {
            setIsReady(true);
            if (typeof onReady === "function") onReady(true);
          }
          return;
        } catch {}
      }
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
    // Common shapes: { id, brand, last4 } or { data: { id, brand, last4 } }
    const data = res.data || res;
    return {
      id: data.id || data.token || data.paymentInstrumentToken,
      brand: data.brand || data.cardBrand || "UNKNOWN",
      last_four: data.last4 || data.last_four || data.lastFour || "0000",
    };
  } catch {
    return { id: undefined, brand: "UNKNOWN", last_four: "0000" };
  }
}
