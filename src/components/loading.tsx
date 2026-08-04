function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-second px-4">
            <div className="w-full max-w-xs">
                <div className="relative h-1.5 w-full bg-second rounded-full overflow-hidden">
                    <div className="absolute h-full bg-darks rounded-full animate-loadingbar" />
                </div>
                <p className="text-center text-xs text-tinted mt-3">Memuat...</p>
            </div>
        </div>
    );
}

export default Loading
