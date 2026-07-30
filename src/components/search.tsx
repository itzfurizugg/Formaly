import { useState } from "react";
import { supabase } from "../lib/supabase";

function Search() {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!token.trim()) return;
        setLoading(true);
        setError("");

        const { data, error: rpcError } = await supabase.rpc("get_form_by_token", {
            p_token: token.trim(),
        });

        setLoading(false);

        if (rpcError || !data || data.length === 0) {
            setError("Token tidak valid!");
            return;
        }

        alert("Form ditemukan: " + data[0].title);
    };

    return (
        <div className="join">
            <div>
                <label className="input validator join-item border-tinted">
                    <input
                        type="text"
                        placeholder="Masukan token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        required
                    />
                </label>
                {error && <div className="text-wrong text-sm mt-1">{error}</div>}
            </div>
            <button
                className="btn join-item bg-darks text-base border-none"
                onClick={handleJoin}
                disabled={loading}
            >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : "Join"}
            </button>
        </div>
    );
}

export default Search;
