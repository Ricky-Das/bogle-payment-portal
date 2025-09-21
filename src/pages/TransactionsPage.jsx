import React, { useEffect, useState } from "react";
import apiClient from "../config/api";

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.listTransactions({ limit, offset });
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.transactions)
        ? data.transactions
        : Array.isArray(data)
        ? data
        : [];
      setTransactions(items);
    } catch (err) {
      setError(err.message || "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]);

  const nextPage = () => setOffset((prev) => prev + limit);
  const prevPage = () => setOffset((prev) => Math.max(0, prev - limit));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Page size</label>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={limit}
              onChange={(e) => {
                setOffset(0);
                setLimit(parseInt(e.target.value, 10));
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded text-red-800 text-sm">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Currency</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.length ? (
                  transactions.map((t) => (
                    <tr
                      key={t.id || t.transaction_id}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2 pr-4 font-mono text-xs">
                        {t.id || t.transaction_id}
                      </td>
                      <td className="py-2 pr-4">
                        {t.amount_cents != null
                          ? `$${(t.amount_cents / 100).toFixed(2)}`
                          : t.amount != null
                          ? t.amount
                          : "-"}
                      </td>
                      <td className="py-2 pr-4">{t.currency || "USD"}</td>
                      <td className="py-2 pr-4">
                        {t.payment_method || t.method || "-"}
                      </td>
                      <td className="py-2 pr-4">{t.status || "-"}</td>
                      <td className="py-2 pr-4">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <button
            className="px-3 py-2 border rounded disabled:opacity-50"
            onClick={prevPage}
            disabled={offset === 0 || isLoading}
          >
            Previous
          </button>
          <div className="text-sm text-gray-600">Offset {offset}</div>
          <button
            className="px-3 py-2 border rounded"
            onClick={nextPage}
            disabled={isLoading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionsPage;
