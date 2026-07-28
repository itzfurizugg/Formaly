function Search() {
    return (
        <div className="join">
            <div>
                <label className="input validator join-item border-accentOne">
                    <input type="token" placeholder="Masukan token" required />
                </label>
                <div className="validator-hint hidden text-wrong">Token tidak valid!</div>
            </div>
            <button className="btn join-item bg-accentTwo text-base border-none">Join</button>
        </div>
    );
}

export default Search;