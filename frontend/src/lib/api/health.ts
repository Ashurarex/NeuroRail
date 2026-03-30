/**
 * Backend health check utility
 * Use this to verify backend connectivity before running tests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function checkBackendHealth() {
    try {
        console.log("🔍 Checking backend health...");
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            console.error(`❌ Backend returned ${response.status}`);
            const text = await response.text();
            return {
                healthy: false,
                status: response.status,
                message: text || "Backend error",
            };
        }

        const data = await response.json();
        console.log("✅ Backend is healthy:", data);
        return {
            healthy: true,
            status: 200,
            message: data,
        };
    } catch (error) {
        console.error("❌ Backend unreachable:", error);
        return {
            healthy: false,
            status: 0,
            message: `Cannot connect to backend at ${API_BASE_URL}. Make sure it's running.`,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function testMockLogin(email: string) {
    try {
        console.log(`🔐 Testing mock login for ${email}...`);
        const response = await fetch(`${API_BASE_URL}/mock-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            console.error(`❌ Mock login failed: ${response.status}`);
            const text = await response.text();
            return {
                success: false,
                status: response.status,
                message: text || "Login error",
            };
        }

        const data = await response.json();
        console.log(`✅ Mock login successful for ${email}:`, data);
        return {
            success: true,
            status: 200,
            token: data.access_token,
            role: data.role,
        };
    } catch (error) {
        console.error(`❌ Mock login error:`, error);
        return {
            success: false,
            status: 0,
            message: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function runFullDiagnostics() {
    console.log("🏥 Running full backend diagnostics...\n");

    const health = await checkBackendHealth();
    console.log("Health Check Result:", health);

    if (!health.healthy) {
        console.error("\n❌ Backend is not running or unreachable.");
        console.error("   Make sure to start the backend with: uvicorn app.main:app --reload");
        return { health };
    }

    const login = await testMockLogin("test@example.com");
    console.log("\nMock Login Result:", login);

    if (!login.success) {
        console.error("\n❌ Mock login failed. Check backend logs for details.");
        return { health, login };
    }

    console.log("\n✅ All diagnostics passed!");
    return { health, login, success: true };
}

// Auto-run diagnostics on app startup in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    if (process.env.NEXT_PUBLIC_DEBUG === "true") {
        console.log("📋 Scheduling backend diagnostics...");
        setTimeout(() => {
            void runFullDiagnostics();
        }, 1000);
    }
}
