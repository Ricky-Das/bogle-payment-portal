import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
// Finix uses applicationId + environment (no client publishable key)

const DEFAULT_FINIX_SDK_URL =
  import.meta.env.VITE_FINIX_SDK_URL || "https://js.finix.com/v/1/finix.js";
const FINIX_APPLICATION_ID = import.meta.env.VITE_FINIX_APPLICATION_ID || "";
const FINIX_ENVIRONMENT = import.meta.env.VITE_FINIX_ENVIRONMENT || "sandbox";
const FINIX_MERCHANT_ID = import.meta.env.VITE_FINIX_MERCHANT_ID || "";
const FINIX_FRAUD_SDK_URL = import.meta.env.VITE_FINIX_FRAUD_SDK_URL || "";
const FINIX_FRAUD_ENABLED =
  (import.meta.env.VITE_FINIX_FRAUD_ENABLED ?? "true") !== "false";

async function initializeFinixAuthWithRetry(
  finixGlobal,
  retries = 3,
  delay = 1000
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Initializing Finix Auth (attempt ${attempt}/${retries})...`);

      const finixAuth = finixGlobal.Auth(
        FINIX_ENVIRONMENT,
        FINIX_MERCHANT_ID,
        (sessionKey) => {
          try {
            if (sessionKey) window.FINIX_FRAUD_SESSION_ID = sessionKey;
          } catch {}
          console.log(
            "Finix Auth initialized with session key:",
            sessionKey ? "present" : "empty"
          );
        }
      );

      // Wait briefly and check if session key is available
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (typeof finixAuth.getSessionKey === "function") {
        const sessionKey = finixAuth.getSessionKey();
        if (sessionKey) {
          console.log("Finix Auth service initialized successfully");
          return finixAuth;
        }
      }

      // If no session key yet, store auth and continue
      console.log("Finix Auth initialized, waiting for session key...");
      return finixAuth;
    } catch (error) {
      console.warn(`Finix Auth init attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        console.error("All Finix Auth initialization attempts failed");
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(false);
    let script = document.querySelector(`script[src="${src}"]`);

    if (script) {
      // If we've previously marked it loaded, resolve immediately
      if (script.dataset.loaded === "true") return resolve(true);
      // If global is already available, consider it loaded
      if (window.Finix || window.finix) {
        script.dataset.loaded = "true";
        return resolve(true);
      }
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
  const finixAuthRef = useRef(null);
  const initStartedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode / HMR
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;
    async function init() {
      try {
        await loadScriptOnce(sdkUrl);
      } catch {
        // Ignore load failure; we'll fallback to stub tokenization
      }

      // Fraud capabilities are typically included in the main Finix SDK
      // No need to load a separate fraud.js unless specifically required

      // Initialize Finix Auth service for fraud detection
      const finixGlobal = window.Finix || window.finix || null;
      if (
        FINIX_FRAUD_ENABLED &&
        finixGlobal &&
        finixGlobal.Auth &&
        FINIX_MERCHANT_ID
      ) {
        try {
          const finixAuth = await initializeFinixAuthWithRetry(finixGlobal);
          finixAuthRef.current = finixAuth;
        } catch (error) {
          console.warn(
            "Failed to initialize Finix Auth service after retries:",
            error
          );
        }
      } else {
        if (!FINIX_FRAUD_ENABLED) {
          console.info(
            "Finix fraud disabled via VITE_FINIX_FRAUD_ENABLED=false"
          );
        } else {
          console.info(
            "Finix Auth not available or merchant ID not configured - fraud detection disabled"
          );
        }
      }

      // Canonical API per docs: CardTokenForm("container-id", options)
      if (finixGlobal && typeof finixGlobal.CardTokenForm === "function") {
        try {
          console.log("Attempting to create CardTokenForm with:", {
            containerId: formContainerId,
            applicationId: FINIX_APPLICATION_ID,
            environment: FINIX_ENVIRONMENT,
            merchantId: FINIX_MERCHANT_ID,
          });

          // Per docs: constructor is CardTokenForm(elementId, options) - NO new keyword
          const instance = finixGlobal.CardTokenForm(formContainerId, {
            showLabels: true,
            showPlaceholders: true,
            showAddress: false, // We collect ZIP separately for AVS
          });

          console.log("CardTokenForm created successfully:", instance);

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
        } catch (error) {
          console.error("Failed to create CardTokenForm:", error);
        }
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
      finixAuthRef.current = null;
      initStartedRef.current = false;
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
    async getFraudSessionId(timeout = 5000) {
      // Use the properly initialized Finix Auth service
      const finixAuth = finixAuthRef.current;

      // Fallback if session key was set globally by callback
      if (window.FINIX_FRAUD_SESSION_ID) {
        return window.FINIX_FRAUD_SESSION_ID;
      }

      if (!finixAuth) {
        console.info(
          "Finix Auth not initialized - proceeding without fraud session ID"
        );
        return undefined;
      }

      // Poll for session key with timeout
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        try {
          // Standard Finix Auth method: getSessionKey()
          if (typeof finixAuth.getSessionKey === "function") {
            const sessionKey = finixAuth.getSessionKey();
            if (sessionKey) {
              console.log("Fraud session key obtained:", "present");
              return sessionKey;
            }
          }

          // Alternative method names
          if (typeof finixAuth.getSessionId === "function") {
            const sessionId = finixAuth.getSessionId();
            if (sessionId) {
              console.log("Fraud session ID obtained:", "present");
              return sessionId;
            }
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.warn("Error getting fraud session key:", error);
          break;
        }
      }

      console.warn("Fraud session ID not available after timeout");
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
      {(!FINIX_APPLICATION_ID || !FINIX_MERCHANT_ID) && (
        <p className="mt-2 text-xs text-gray-500">
          Finix tokenization is not fully configured. Define
          VITE_FINIX_APPLICATION_ID and VITE_FINIX_MERCHANT_ID to enable
          tokenization and fraud detection.
        </p>
      )}
      {FINIX_APPLICATION_ID &&
        FINIX_MERCHANT_ID &&
        import.meta.env.MODE === "development" && (
          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <div>
              <strong>Fraud Detection:</strong>{" "}
              {FINIX_FRAUD_ENABLED ? "Enabled" : "Disabled"}
            </div>
            <div>
              <strong>Environment:</strong> {FINIX_ENVIRONMENT}
            </div>
            <div>
              <strong>Merchant:</strong> {FINIX_MERCHANT_ID}
            </div>
          </div>
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
