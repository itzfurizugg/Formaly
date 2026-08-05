import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Copy, QrCode, ClipboardList, KeyRound } from "lucide-react"
import { showAlert } from "../../lib/alerts"

function Shared() {
    const { id } = useParams()
    const navigate = useNavigate()

    return (
        <div className="flex flex-col items-center px-4 py-10">
            <div className="w-full max-w-7xl">
                <button
                    onClick={() => navigate("/creator")}
                    className="flex items-center gap-2 text-sm text-tinted hover:text-darks mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </button>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => navigate(`/creator/forms/${id}`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        Detail
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/shared`)}
                        className="btn btn-sm bg-darks text-base border-none"
                    >
                        <QrCode className="h-3.5 w-3.5" /> Shared
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/tokens`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        <KeyRound className="h-3.5 w-3.5" /> Token
                    </button>
                    <button
                        onClick={() => navigate(`/creator/forms/${id}/submissions`)}
                        className="btn btn-sm bg-base text-darks border border-second hover:bg-second"
                    >
                        <ClipboardList className="h-3.5 w-3.5" /> Submission
                    </button>
                </div>

                <div className="bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-none">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-darks">Bagikan Form</h2>
                    </div>
                    <p className="text-sm text-tinted mb-4">
                        Form ini sudah public. Bagikan link atau QR code agar orang lain bisa mengerjakannya.
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            className="input flex-1 bg-base border-second focus:border-done focus:outline-none text-sm"
                            value={`${window.location.origin}/form/description?formId=${id}`}
                            onFocus={(e) => e.currentTarget.select()}
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/form/description?formId=${id}`)
                                showAlert("Link disalin.", "success")
                            }}
                            className="btn bg-darks text-base border-none"
                            title="Salin link"
                        >
                            <Copy className="h-4 w-4" />
                            Salin
                        </button>
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-4">
                        <div className="bg-base border border-second rounded-lg p-3 w-fit">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                                    `${window.location.origin}/form/description?formId=${id}`
                                )}`}
                                alt="QR Code"
                                className="w-60 h-auto"
                            />
                        </div>
                        <p className="text-xs text-tinted leading-relaxed">
                            <QrCode className="h-3.5 w-3.5 inline mr-1" />
                            Scan QR code untuk membuka form langsung di perangkat lain.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Shared