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
    let script = document.querySelector(`script[src=\"${src}\"]`);

    if (script) {
      // If we've previously marked it loaded, resolve immediately
      if (script.dataset.loaded === "true") return resolve(true);
      if (script.dataset.error === "true")
        return reject(new Error("Failed to load Finix SDK"));

      // Otherwise, listen for its load/error
      const onLoad = () => {
        script.dataset.loaded = "true";
        cleanup();
        resolve(true);
      };
      const onError = () => {
        script.dataset.error = "true";
        cleanup();
        reject(new Error("Failed to load Finix SDK"));
      };
      const cleanup = () => {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
      };
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      return;
    }

    // Create new tag
    script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(true);
    };
    script.onerror = () => {
      script.dataset.error = "true";
      reject(new Error("Failed to load Finix SDK"));
    };
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

      // Fraud capabilities are typically included in the main Finix SDK
      // No need to load a separate fraud.js unless specifically required

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

      // Initialize Fraud capabilities if available in main SDK
      if (finixGlobal) {
        try {
          const Fraud =
            finixGlobal.Fraud || window.FinixFraud || window.finixFraud;
          if (Fraud) {
            console.log("Initializing Finix Fraud capabilities...");

            // Try multiple initialization patterns
            if (typeof Fraud.configure === "function") {
              Fraud.configure({
                applicationId: FINIX_APPLICATION_ID,
                environment: FINIX_ENVIRONMENT,
              });
            } else if (typeof Fraud.init === "function") {
              Fraud.init({
                applicationId: FINIX_APPLICATION_ID,
                environment: FINIX_ENVIRONMENT,
              });
            } else if (typeof Fraud.setup === "function") {
              Fraud.setup({
                applicationId: FINIX_APPLICATION_ID,
                environment: FINIX_ENVIRONMENT,
              });
            } else if (typeof Fraud === "function") {
              Fraud({
                applicationId: FINIX_APPLICATION_ID,
                environment: FINIX_ENVIRONMENT,
              });
            }

            console.log("Finix Fraud capabilities initialized");
          } else {
            console.info(
              "Finix Fraud capabilities not available in this SDK version"
            );
          }
        } catch (error) {
          console.warn("Failed to initialize Finix Fraud capabilities:", error);
        }
      }

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
            instance,
            async tokenize() {
              const env = FINIX_ENVIRONMENT;
              const appId = FINIX_APPLICATION_ID;
              if (typeof instance.submit !== "function") {
                throw new Error("Finix CardTokenForm not available");
              }
              // Per Finix docs: submit(environment, applicationId, callback)
              const res = await new Promise((resolve, reject) => {
                instance.submit(env, appId, (err, data) => {
                  if (err) {
                    console.error("Finix tokenization error:", err);
                    return reject(
                      new Error(`Tokenization failed: ${err.message || err}`)
                    );
                  }
                  if (!data || !data.data || !data.data.id) {
                    return reject(
                      new Error("Invalid token response from Finix")
                    );
                  }
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
        const cardForm = inst.instance; // underlying Finix CardTokenForm instance
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
          () =>
            cardForm &&
            typeof cardForm.submit === "function" &&
            new Promise((resolve, reject) => {
              cardForm.submit(
                FINIX_ENVIRONMENT,
                FINIX_APPLICATION_ID,
                (err, data) => {
                  if (err) return reject(err);
                  resolve(data);
                }
              );
            }),
          // Some SDK builds may support createToken(options)
          () =>
            cardForm &&
            typeof cardForm.createToken === "function" &&
            cardForm.createToken(primaryOpts),
          // Alternate parameter orders seen in older samples
          () =>
            cardForm &&
            typeof cardForm.submit === "function" &&
            new Promise((resolve, reject) => {
              cardForm.submit(primaryOpts, (err, data) => {
                if (err) return reject(err);
                resolve(data);
              });
            }),
        ];

        for (const fn of attempts) {
          try {
            const res = await (fn && fn());
            if (res) return normalizeToken(res);
          } catch (e) {
            console.warn("Tokenization attempt failed:", e.message);
            // Try next signature
          }
        }

        // No working method found
        console.error(
          "All tokenization methods failed with available Finix CardTokenForm instance"
        );
        throw new Error(
          "Finix tokenization failed - check console for details"
        );
      }
      // Check if we're in development and should allow fallback
      if (import.meta.env.MODE === "production") {
        throw new Error(
          "Finix tokenization is required in production but SDK not available"
        );
      }

      // Development fallback - only if no real tokenization is available
      console.warn(
        "Finix SDK not available - using development stub tokenization"
      );
      console.warn("This will NOT work with real payment processing!");

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: `TK_${Math.random().toString(36).slice(2, 12)}`,
            brand: "VISA",
            last_four: "4242",
          });
        }, 400);
      });
    },
    getFraudSessionId() {
      // Check multiple possible fraud SDK namespaces in priority order
      const finixGlobal = window.Finix || window.finix || {};
      const fraudSDK =
        finixGlobal.Fraud || window.FinixFraud || window.finixFraud || null;

      if (!fraudSDK) {
        console.info(
          "Finix Fraud capabilities not available - proceeding without enhanced risk data"
        );
        return undefined;
      }

      // Try different methods the fraud SDK might expose
      try {
        // Most common pattern: getSessionId()
        if (typeof fraudSDK.getSessionId === "function") {
          const sessionId = fraudSDK.getSessionId();
          console.log(
            "Fraud session ID obtained:",
            sessionId ? "present" : "empty"
          );
          return sessionId;
        }

        // Alternative: sessionId as function
        if (typeof fraudSDK.sessionId === "function") {
          const sessionId = fraudSDK.sessionId();
          console.log(
            "Fraud session ID (via sessionId()):",
            sessionId ? "present" : "empty"
          );
          return sessionId;
        }

        // Alternative: getSession() returning object
        if (typeof fraudSDK.getSession === "function") {
          const session = fraudSDK.getSession();
          const sessionId = session?.id || session?.sessionId;
          console.log(
            "Fraud session ID (via getSession()):",
            sessionId ? "present" : "empty"
          );
          return sessionId;
        }

        // Static property
        if (fraudSDK.sessionId && typeof fraudSDK.sessionId === "string") {
          console.log("Fraud session ID (static property):", "present");
          return fraudSDK.sessionId;
        }

        // Check if the fraud SDK itself has an id property
        if (fraudSDK.id && typeof fraudSDK.id === "string") {
          console.log("Fraud session ID (direct id property):", "present");
          return fraudSDK.id;
        }

        console.warn("Fraud SDK loaded but no session ID method found");
        console.log("Available fraud SDK methods:", Object.keys(fraudSDK));
      } catch (error) {
        console.warn("Error getting fraud session ID:", error);
      }

      return undefined;
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
    if (!res) {
      throw new Error("Empty tokenization response");
    }

    // Handle multiple shapes:
    // 1) { data: { id: 'TK...' } }
    // 2) { id: 'TK...' }
    // 3) direct string 'TK...'
    let tokenData = {};
    let token = undefined;

    if (typeof res === "string") {
      token = res;
      tokenData = {};
    } else if (res && typeof res === "object") {
      if (res.data && typeof res.data === "object") {
        tokenData = res.data;
        token = res.data.id;
      } else {
        tokenData = res;
        token = res.id;
      }
    }

    // Validate TK token format (Finix uses "TK" prefix, not always "TK_")
    if (!token || (!token.startsWith("TK_") && !token.startsWith("TK"))) {
      throw new Error(`Invalid token format: expected TK prefix, got ${token}`);
    }

    return {
      id: token,
      brand: tokenData.brand || tokenData.brand_name || "UNKNOWN",
      last_four:
        tokenData.last_four || tokenData.lastFour || tokenData.last4 || "0000",
    };
  } catch (error) {
    console.error("Token normalization error:", error);
    throw new Error(`Token processing failed: ${error.message}`);
  }
}
