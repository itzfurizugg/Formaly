import Search from "../components/search";

function Home() {
    return (
        <div>
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-darks">
                    Mulai mengerjakan!
                </h1>
                <p className="text-tinted mt-3 max-w-md">
                    Masukan token yang diberikan untuk mulai mengerjakan.
                </p>

                <div className="w-full max-w-xl mt-8">
                    <Search />
                </div>
            </div>
        </div>
    );
}

export default Home;