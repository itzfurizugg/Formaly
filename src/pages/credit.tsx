import { motion, type Variants } from "motion/react"
import { Heart } from "lucide-react"
import logo from "../assets/logo.svg"
import { easeOutExpo } from "../lib/motion"
import BackButton from "../components/backButton"
import char from "../assets/ash.png"

interface Member {
    name: string
    role: string
    picture: string
}

const TEAM: Member[] = [
    { name: "rizuki", role: "Project Manager", picture: "https://scontent-cgk1-2.cdninstagram.com/v/t51.82787-19/712844450_18320123443276603_541539777025189551_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-cgk1-2.cdninstagram.com&_nc_cat=107&_nc_oc=Q6cZ2gEXH8ZpE91KmAX28hcVQDYHAIIVduQ3vl76-_p2f4xuFM2JEVSzx-odB4ZGXQgdbm0&_nc_ohc=UunM3Pmh14wQ7kNvwFnXRu8&_nc_gid=DRLDmB55IpazR66tqNsmGg&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AQLwrP8FyD_M79sVjSyo1b1a7ejPk4CBqzRZze21kKBdEg&oe=6ABA6802&_nc_sid=7a9f4b" },
    { name: "wecrashcha", role: "Web Developer", picture: "" },
    { name: "ladyashf", role: "Illustrator", picture: "" },
    { name: "chaaaichaaa", role: "UI/UX Designer", picture: "" },
    { name: "azharaaurellie", role: "UI/UX Designer", picture: "" },
    { name: "Hmmmmmmm", role: "Developer", picture: "" },
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
        transition: { duration: 0.4, ease: easeOutExpo },
    },
}

function CreditPage() {
    return (
        <div className="flex flex-col items-center px-3.5 py-6">
            <div className="max-w-4xl w-full">
                <BackButton to="/profile" showOnDesktop />

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: easeOutExpo }}
                    className="flex flex-col gap-6 bg-white dark:bg-second border border-second rounded-2xl lg:rounded-xl mb-3 px-3.5 py-10 text-start sm:flex-row sm:items-center sm:justify-between sm:px-10"
                >
                    <div className="flex flex-col items-start">
                        <img src={logo} alt="Formaly" className="h-10 w-auto mb-5" />
                        <h1 className="text-3xl md:text-4xl font-display font-bold uppercase text-darks">
                            Tentang Formaly
                        </h1>
                        <p className="text-sm md:text-base text-tinted mt-3 max-w-lg leading-relaxed">
                            Platform formulir dan kuesioner yang membantu kamu membuat,
                            membagikan, dan menganalisis formulir dengan mudah —
                            dari kuis singkat sampai survei besar.
                        </p>
                    </div>

                    <div className="flex items-end justify-center">
                        <img src={char} alt="Maskot Formaly" className="h-60 w-auto" />
                    </div>
                </motion.div>

                {/* Tim */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="bg-white dark:bg-second border border-second rounded-2xl lg:rounded-xl mb-3 p-5"
                >
                    <div className="flex items-center gap-2.5 mb-4">
                        <div>
                            <h2 className="text-base font-bold text-darks">Tim di Balik Formaly</h2>
                            <p className="text-xs text-tinted">Kenalan dengan orang-orang di baliknya.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {TEAM.map((member, i) => (
                            <motion.div
                                key={member.name + i}
                                variants={item}
                                className="flex flex-row items-center gap-2 bg-base border border-second rounded-2xl lg:rounded-xl p-4 text-center"
                            >
                                <div
                                    className={`w-8 h-8 shrink-0 rounded-full overflow-hidden ${AVATAR_STYLE[i % AVATAR_STYLE.length]} flex items-center justify-center`}
                                >
                                    {member.picture ? (
                                        <img
                                            src={member.picture}
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs font-bold uppercase text-white dark:text-white">
                                            {member.name.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-darks truncate w-full">@{member.name}</p>
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
                    className="bg-white dark:bg-second border border-second rounded-2xl lg:rounded-xl mb-3 p-5"
                >
                    <div className="flex items-center gap-2.5 mb-4">
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
                                {tech}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: easeOutExpo, delay: 0.3 }}
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
