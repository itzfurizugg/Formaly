import { motion, type Variants } from "motion/react"
import { Users, Layers, Heart, Sparkles } from "lucide-react"
import logo from "../assets/logo.svg"
import BackButton from "../components/backButton"

interface Member {
    name: string
    role: string
}

const TEAM: Member[] = [
    { name: "Nama Anggota", role: "Project Manager" },
    { name: "Nama Anggota", role: "UI/UX Designer" },
    { name: "Nama Anggota", role: "Frontend Developer" },
    { name: "Nama Anggota", role: "Backend Developer" },
]

const AVATAR_STYLE = ["bg-done", "bg-pass", "bg-darks", "bg-wrong"]

const TECH_STACK = [
    "React",
    "TypeScript",
    "Vite",
    "Tailwind CSS",
    "daisyUI",
    "Supabase",
    "Motion",
    "Lucide Icons",
]

const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
}

const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
}

function CreditPage() {
    return (
        <div className="flex flex-col items-center px-3.5 py-6">
            <div className="max-w-4xl w-full">
                <BackButton to="/profile" />

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white border border-second rounded-2xl lg:rounded-xl mb-3 px-3.5 py-10 flex flex-col items-center text-center"
                >
                    <img src={logo} alt="Formaly" className="h-10 w-auto mb-5" />
                    <h1 className="text-3xl md:text-4xl font-display font-bold uppercase text-darks">
                        Tentang Formaly
                    </h1>
                    <p className="text-sm md:text-base text-tinted mt-3 max-w-lg leading-relaxed">
                        Platform formulir dan kuesioner yang membantu kamu membuat,
                        membagikan, dan menganalisis formulir dengan mudah —
                        dari kuis singkat sampai survei besar.
                    </p>
                </motion.div>

                {/* Tim */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="bg-white border border-second rounded-2xl lg:rounded-xl mb-3 p-5"
                >
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-base flex items-center justify-center">
                            <Users className="h-4 w-4 text-darks" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-darks">Tim di Balik Formaly</h2>
                            <p className="text-xs text-tinted">Kenalan dengan orang-orang di baliknya.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {TEAM.map((member, i) => (
                            <motion.div
                                key={member.name + i}
                                variants={item}
                                className="flex flex-col items-center gap-2 bg-base border border-second rounded-2xl lg:rounded-xl p-4 text-center"
                            >
                                <div
                                    className={`w-14 h-14 shrink-0 rounded-full ${AVATAR_STYLE[i % AVATAR_STYLE.length]} flex items-center justify-center`}
                                >
                                    <span className="text-xl font-bold text-white">
                                        {member.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-darks truncate w-full">{member.name}</p>
                                <span className="text-xs text-tinted">{member.role}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Teknologi */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="bg-white border border-second rounded-2xl lg:rounded-xl mb-3 p-5"
                >
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-base flex items-center justify-center">
                            <Layers className="h-4 w-4 text-darks" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-darks">Teknologi yang Digunakan</h2>
                            <p className="text-xs text-tinted">Dibangun di atas tools open-source terbaik.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TECH_STACK.map((tech) => (
                            <span
                                key={tech}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-base border border-second text-darks px-3.5 py-1.5 rounded-full"
                            >
                                <Sparkles className="h-3 w-3 text-done" />
                                {tech}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="text-center text-xs text-tinted mt-4 flex items-center justify-center gap-1"
                >
                    Dibuat dengan <Heart className="h-3 w-3 text-wrong fill-wrong" /> oleh Tim Formaly ©{" "}
                    {new Date().getFullYear()}
                </motion.p>
            </div>
        </div>
    )
}

export default CreditPage
