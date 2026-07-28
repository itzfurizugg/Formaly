import logo from "../assets/logo.svg"
import { House, RotateCcwClock, UserRound } from 'lucide-react';

function Navbar() {
    return (
        <div className="navbar shadow-sm bg-base">
            <div className="flex-1 flex items-center">
                <img src={logo} alt="Formaly" className="h-6 w-auto ml-10" />
            </div>

            <div className="flex-1 flex justify-center">
                <a className="btn btn-ghost text-accentTwo"><House className="h-4 w-auto" /> Beranda</a>
                <a className="btn btn-ghost text-accentTwo"><RotateCcwClock className="h-4 w-auto" /> Histori</a>
                <a className="btn btn-ghost text-accentTwo"><UserRound className="h-4 w-auto" /> Profil</a>
            </div>

            <div className="flex-1 flex justify-end">
                <button className="btn btn-square btn-ghost mr-10 text-accentTwo">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-5 w-5 stroke-current">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default Navbar;