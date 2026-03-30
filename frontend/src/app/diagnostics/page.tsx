"use client";

import { useState } from "react";
import {
    checkBackendHealth,
    testMockLogin,
    runFullDiagnostics,
} from "@/lib/api/health";

export default function DiagnosticsPage() {
    const [results, setResults] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [testEmail, setTestEmail] = useState("test@example.com");

    const handleRunDiagnostics = async () => {
        setLoading(true);
        try {
            const result = await runFullDiagnostics();
            setResults(result);
        } catch (error) {
            setResults({ error: error instanceof Error ? error.message : String(error) });
        }
        setLoading(false);
    };

    const handleCheckHealth = async () => {
        setLoading(true);
        try {
            const result = await checkBackendHealth();
            setResults(result);
        } catch (error) {
            setResults({ error: error instanceof Error ? error.message : String(error) });
        }
        setLoading(false);
    };

    const handleTestLogin = async () => {
        setLoading(true);
        try {
            const result = await testMockLogin(testEmail);
            setResults(result);
        } catch (error) {
            setResults({ error: error instanceof Error ? error.message : String(error) });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">🔧 Backend Diagnostics</h1>
                    <p className="text-slate-600 mb-8">
                        Use this page to test backend connectivity and identify issues.
                    </p>

                    {/* Instructions */}
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h2 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h2>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Make sure backend is running: <code className="bg-white px-1">uvicorn app.main:app --reload</code></li>
                            <li>Click <strong>Run Full Diagnostics</strong> to test everything</li>
                            <li>Check browser Console (F12) for detailed logs</li>
                            <li>Check backend terminal for error messages</li>
                        </ol>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-4 mb-8">
                        <button
                            onClick={handleRunDiagnostics}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {loading ? "Running..." : "✅ Run Full Diagnostics"}
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={handleCheckHealth}
                                disabled={loading}
                                className="bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                            >
                                {loading ? "..." : "🏥 Check Health"}
                            </button>

                            <button
                                onClick={handleTestLogin}
                                disabled={loading}
                                className="bg-purple-600 text-white font-semibold py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                            >
                                {loading ? "..." : "🔐 Test Login"}
                            </button>
                        </div>

                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="test@example.com"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Results */}
                    {results && (
                        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">📊 Results:</h2>
                            <pre className="text-xs bg-white p-4 rounded border border-slate-300 overflow-auto max-h-96 text-slate-700">
                                {JSON.stringify(results, null, 2)}
                            </pre>

                            {!!((results as Record<string, unknown>).success) && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                                    ✅ All checks passed! Backend is working correctly.
                                </div>
                            )}

                            {!!((results as Record<string, unknown>).error) && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                                    ❌ Error: {String((results as Record<string, unknown>).error)}
                                </div>
                            )}

                            {(results as Record<string, unknown>).healthy === false && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                                    ❌ Backend is unreachable. Check:
                                    <ul className="list-disc list-inside mt-2 ml-2">
                                        <li>Backend server is running on port 8000</li>
                                        <li>No firewall blocking localhost:8000</li>
                                        <li>Your internet connection</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Troubleshooting */}
                    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <h2 className="font-semibold text-amber-900 mb-3">🐛 Troubleshooting:</h2>
                        <div className="text-sm text-amber-800 space-y-2">
                            <p><strong>Backend won&apos;t start:</strong> Check requirements.txt is installed: <code className="bg-white px-1">pip install -r requirements.txt</code></p>
                            <p><strong>Database connection error:</strong> Make sure PostgreSQL is running and credentials match</p>
                            <p><strong>Demo user creation fails:</strong> Check browser console and backend terminal for specific error message</p>
                            <p><strong>Need more help?</strong> Open browser DevTools (F12) → Console tab to see all diagnostic logs</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-slate-600">
                    <p>🚀 <a href="/user/home" className="text-blue-600 hover:underline">Back to Dashboard</a></p>
                </div>
            </div>
        </div>
    );
}
