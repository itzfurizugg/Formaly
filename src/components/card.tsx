import { Play } from 'lucide-react';

function Card() {
    return (
        <div className="card w-200 rounded-none bg-base mb-5">
            <div className="card-body">
                <h2 className="card-title text-accentTwo">AAT Konsentrasi Keahlian Kelas 11 RPL</h2>
                <p className="text-accentOne">Oleh Mujahid Robbani Sholahudin</p>
                <div className="card-actions justify-end">
                    <button className="btn rounded-none bg-accentTwo text-base border-none"><Play className='h-4 w-auto' fill="currentColor" strokeWidth={0} /> Mulai</button>
                </div>
            </div>
        </div>
    );
}

export default Card;