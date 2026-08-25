import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { Copy, QrCode, Globe } from "lucide-react"
import { showAlert } from "../../lib/alerts"
import { supabase } from "../../lib/supabase"
import BackButton from "../../components/backButton"
import FormTabs from "../../components/creator/formTabs"

function Shared() {
    const { id } = useParams()
    const [tags, setTags] = useState<string[]>([])
    const [shortMode, setShortMode] = useState(false)

    useEffect(() => {
        if (!id) return
        supabase
            .from("form_tags")
            .select("tag:tags ( name )")
            .eq("form_id", id)
            .then(({ data }) => {
                if (data) {
                    setTags(
                        data
                            .map((r) => (r.tag as unknown as { name: string } | null)?.name)
                            .filter((n): n is string => !!n)
                    )
                }
            })
    }, [id])

    const tag = tags[0]
    const shortUrl = tag ? `${window.location.origin}/form/${encodeURIComponent(tag)}` : null
    const longUrl = `${window.location.origin}/form/description?formId=${id}`
    const shareUrl = shortMode && shortUrl ? shortUrl : longUrl

    const copy = () => {
        navigator.clipboard.writeText(shareUrl)
        showAlert("Link disalin.", "success")
    }

    return (
        <div className="flex flex-col items-center px-3.5 sm:px-6 py-5 sm:py-10">
            <div className="w-full xl:max-w-7xl lg:max-w-5xl">
                <BackButton to="/creator" />

                <FormTabs id={id} active="shared" />

                <div className="bg-white border border-second p-3 lg:p-6 sm:p-4 shadow-sm rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-darks mt-2 ml-2">Bagikan Form</h2>
                    </div>
                    <p className="text-sm text-tinted mb-4 ml-2">
                        Form ini sudah public. Bagikan link atau QR code agar orang lain bisa mengerjakannya.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            readOnly
                            className="input w-full sm:flex-1 bg-base border-second focus:border-done focus:outline-none text-sm"
                            value={shareUrl}
                            onFocus={(e) => e.currentTarget.select()}
                        />
                        <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                // Tanpa tag → notifikasi toast, jangan ganti mode link.
                                if (!shortUrl) {
                                    showAlert("Form belum punya tag. Tambahkan tag di halaman Detail agar bisa pakai link singkat.", "warning")
                                    return
                                }
                                setShortMode((v) => !v)
                            }}
                            className="btn bg-base text-darks border-second flex-1 sm:flex-none"
                            title={shortUrl ? (shortMode ? "Kembalikan ke link panjang" : "Ubah ke link singkat") : "Tambahkan tag untuk link singkat"}
                        >
                            <Globe className="h-4 w-4"/>
                            {shortMode ? "Link Asli" : "Link dari Tag"}
                        </button>
                        <button
                            onClick={copy}
                            className="btn bg-darks text-base border-none flex-1 sm:flex-none"
                            title="Salin link"
                        >
                            <Copy className="h-4 w-4" />
                            Salin
                        </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-4">
                        <div className="bg-base border border-second rounded-lg p-3 w-fit">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(shareUrl)}`}
                                alt="QR Code"
                                className="w-60 h-auto"
                            />
                        </div>
                        <p className="text-xs text-tinted leading-relaxed hidden sm:block">
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