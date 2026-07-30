export interface Answer {
    [key: number]: number
}

export interface Question {
    id: number
    text: string
    options: string[]
}

export const dummyQuestions: Question[] = [
    { id: 1, text: "Apa kepanjangan dari RPL Jurusan Buangan di SMKN 10 Jakarta? Apakah Jurusan tersebut sering mendapatkan rasisme dari Jurusan lain?", options: ["Rekayasa Perangkat Lunak SMKN 10 Jakarta merupakan Jurusan terbaik di DKI Jakarta, menawarkan pembelajaran berbasis digital dan jurusan buangan di sekolah ini", "Rancangan Perangkat Lunak", "Rekayasa Pembelajaran Langsung", "Rencana Pembelajaran Luas"] },
    { id: 2, text: "Siapa penemu bahasa pemrograman Python?", options: ["Guido van Rossum", "Dennis Ritchie", "Bjarne Stroustrup", "James Gosling"] },
    { id: 3, text: "Apa fungsi dari tag `<p>` dalam HTML?", options: ["Membuat paragraf", "Membuat heading", "Membuat link", "Menyisipkan gambar"] },
    { id: 4, text: "Database relational biasanya menggunakan?", options: ["MySQL", "MongoDB", "Firebase", "Redis"] },
    { id: 5, text: "Apa itu API?", options: ["Application Programming Interface", "Advanced Programming Instruction", "Automated Process Integration", "Application Process Instance"] },
    { id: 6, text: "Dalam pengembangan aplikasi berbasis web modern, mengapa banyak developer memilih menggunakan framework seperti React atau Vue dibandingkan menulis JavaScript murni (vanilla JS), terutama untuk aplikasi berskala besar dengan banyak state yang saling berhubungan?", options: ["Karena framework menyediakan cara terstruktur untuk mengelola state dan re-render UI secara efisien, sehingga kode lebih mudah dipelihara dan dikembangkan dalam tim besar", "Karena framework lebih cepat diketik", "Karena vanilla JS tidak bisa dipakai untuk web", "Karena framework tidak butuh browser"] },
    { id: 7, text: "Apa singkatan dari CSS?", options: ["Cascading Style Sheets", "Computer Style System", "Creative Style Syntax", "Central Style Sheets"] },
    { id: 8, text: "Manakah yang bukan termasuk bahasa pemrograman?", options: ["HTML", "Python", "Java", "C++"] },
    { id: 9, text: "Apa nama protokol yang digunakan untuk mengirim email?", options: ["SMTP", "HTTP", "FTP", "SSH"] },
    { id: 10, text: "Git digunakan untuk apa?", options: ["Version control", "Kompilasi kode", "Mendesain UI", "Testing otomatis"] },
    { id: 11, text: "Perusahaan mana yang mengembangkan sistem operasi Android, dan pada tahun berapa Android pertama kali dirilis secara resmi ke publik sebagai sistem operasi mobile open-source?", options: ["Google, dirilis pertama kali pada tahun 2008 melalui perangkat HTC Dream sebagai ponsel Android komersial pertama di dunia", "Apple, tahun 2007", "Microsoft, tahun 2010", "Samsung, tahun 2009"] },
    { id: 12, text: "Apa fungsi utama dari CPU?", options: ["Memproses instruksi", "Menyimpan data permanen", "Menampilkan gambar", "Menghubungkan ke internet"] },
    { id: 13, text: "Apa itu variabel dalam pemrograman?", options: ["Tempat menyimpan nilai", "Jenis file", "Nama fungsi", "Alamat website"] },
    { id: 14, text: "Manakah struktur data yang bersifat LIFO (Last In First Out)?", options: ["Stack", "Queue", "Array", "Linked List"] },
    { id: 15, text: "Apa kepanjangan dari SQL?", options: ["Structured Query Language", "Simple Query Logic", "Sequential Query List", "System Query Language"] },
    { id: 16, text: "Framework CSS apa yang menggunakan class utility seperti `flex`, `p-4`, dan `text-center`?", options: ["Tailwind CSS", "Bootstrap", "Bulma", "Foundation"] },
    { id: 17, text: "Apa itu bug dalam pemrograman?", options: ["Kesalahan dalam kode", "Fitur tambahan", "Jenis variabel", "Nama server"] },
    { id: 18, text: "Ketika sebuah aplikasi web mengalami downtime akibat lonjakan traffic yang tidak terduga, strategi arsitektur apa yang paling umum diterapkan oleh perusahaan teknologi besar untuk mengatasi masalah skalabilitas tersebut secara otomatis tanpa campur tangan manual dari tim infrastruktur?", options: ["Auto-scaling, yaitu menambah atau mengurangi jumlah server secara otomatis berdasarkan beban traffic yang terpantau secara real-time oleh sistem monitoring", "Mematikan server sementara", "Meminta user mengurangi akses", "Menghapus fitur aplikasi"] },
    { id: 19, text: "Apa fungsi dari `useState` di React?", options: ["Mengelola state komponen", "Membuat routing", "Fetching data", "Styling komponen"] },
    { id: 20, text: "Manakah yang termasuk NoSQL database?", options: ["MongoDB", "PostgreSQL", "MySQL", "MariaDB"] },
    { id: 21, text: "Apa itu localhost?", options: ["Alamat server lokal komputer sendiri", "Nama domain publik", "Jenis database", "Protokol keamanan"] },
    { id: 22, text: "Apa singkatan dari JSON?", options: ["JavaScript Object Notation", "Java Standard Object Notation", "JavaScript Oriented Network", "Joint Syntax Object Notation"] },
    { id: 23, text: "Dalam konteks keamanan siber, apa perbedaan mendasar antara serangan phishing dan serangan malware, dan mengapa phishing dianggap lebih mengandalkan manipulasi psikologis terhadap korban dibandingkan eksploitasi celah teknis pada sistem?", options: ["Phishing menipu korban agar memberikan informasi sensitif secara sukarela melalui rekayasa sosial, sedangkan malware menyerang sistem secara teknis tanpa perlu interaksi langsung dari korban", "Keduanya sama saja", "Phishing hanya menyerang email", "Malware hanya menyerang website"] },
    { id: 24, text: "Apa itu endpoint dalam API?", options: ["URL tujuan request", "Nama variabel", "Jenis database", "Framework CSS"] },
    { id: 25, text: "Bahasa markup apa yang digunakan untuk struktur halaman web?", options: ["HTML", "CSS", "JavaScript", "Python"] },
    { id: 26, text: "Apa itu responsive design?", options: ["Desain yang menyesuaikan ukuran layar", "Desain dengan animasi cepat", "Desain hanya untuk mobile", "Desain tanpa CSS"] },
    { id: 27, text: "Manakah HTTP method yang digunakan untuk mengambil data?", options: ["GET", "POST", "DELETE", "PUT"] },
    { id: 28, text: "Apa itu compiler?", options: ["Program yang menerjemahkan kode ke bahasa mesin", "Program untuk mendesain UI", "Program untuk menyimpan file", "Program untuk browsing internet"] },
    { id: 29, text: "Sebutkan salah satu kelebihan menggunakan TypeScript dibandingkan JavaScript biasa dalam pengembangan aplikasi skala besar, terutama terkait deteksi kesalahan sebelum kode dijalankan di production?", options: ["TypeScript menyediakan static typing yang membantu mendeteksi kesalahan tipe data sejak proses development, sebelum kode benar-benar dijalankan", "TypeScript lebih ringan ukurannya", "TypeScript tidak butuh compiler", "TypeScript hanya untuk backend"] },
    { id: 30, text: "Apa itu framework?", options: ["Kerangka kerja untuk mempercepat pengembangan", "Jenis bahasa pemrograman", "Nama database", "Jenis file gambar"] },
    { id: 31, text: "Port default untuk HTTP adalah?", options: ["80", "443", "8080", "21"] },
    { id: 32, text: "Apa itu cache?", options: ["Penyimpanan sementara untuk mempercepat akses data", "Jenis virus komputer", "Nama protokol jaringan", "Bahasa pemrograman"] },
    { id: 33, text: "Manakah yang merupakan cloud provider?", options: ["AWS", "React", "Figma", "VS Code"] },
    { id: 34, text: "Apa fungsi dari `git commit`?", options: ["Menyimpan perubahan ke local repository", "Mengunggah kode ke internet", "Menghapus file", "Membuat branch baru"] },
    { id: 35, text: "Ketika membangun sistem autentikasi pada aplikasi web, mengapa penyimpanan password dalam bentuk plain text sangat berisiko, dan metode apa yang umum digunakan developer untuk melindungi data password pengguna di database?", options: ["Karena jika database bocor, password bisa langsung dibaca dan disalahgunakan; developer biasanya menggunakan hashing seperti bcrypt untuk mengenkripsi password sebelum disimpan", "Menyimpan password di file teks terpisah", "Mengganti password setiap hari", "Menonaktifkan fitur login"] },
    { id: 36, text: "Apa itu array dalam pemrograman?", options: ["Kumpulan data dalam satu variabel", "Jenis fungsi", "Nama file konfigurasi", "Protokol jaringan"] },
    { id: 37, text: "Manakah bahasa pemrograman yang berjalan di sisi client (browser)?", options: ["JavaScript", "PHP", "Python", "Java"] },
    { id: 38, text: "Apa itu deployment?", options: ["Proses menerbitkan aplikasi ke server produksi", "Proses mendesain UI", "Proses menulis dokumentasi", "Proses testing manual"] },
    { id: 39, text: "Apa singkatan dari URL?", options: ["Uniform Resource Locator", "Universal Retrieval Link", "United Resource Language", "Uniform Retrieval Locator"] },
    { id: 40, text: "Manakah yang termasuk state management library di React?", options: ["Redux", "Tailwind", "Vite", "ESLint"] },
    { id: 41, text: "Apa itu middleware?", options: ["Fungsi perantara sebelum request diproses", "Jenis database", "Nama komponen UI", "Bahasa pemrograman"] },
    { id: 42, text: "Dengan berkembangnya arsitektur microservices dalam pengembangan aplikasi backend modern, apa tantangan utama yang biasanya dihadapi tim engineering dibandingkan dengan arsitektur monolitik tradisional, terutama dalam hal komunikasi antar service dan konsistensi data?", options: ["Kompleksitas komunikasi antar service meningkat karena setiap service berjalan independen, sehingga dibutuhkan mekanisme seperti API gateway dan message queue untuk menjaga konsistensi data", "Microservices selalu lebih lambat", "Monolitik tidak bisa di-deploy", "Microservices tidak butuh database"] },
    { id: 43, text: "Apa itu responsive breakpoint?", options: ["Titik ukuran layar untuk mengubah tampilan", "Jenis error dalam kode", "Nama variabel CSS", "Fungsi JavaScript"] },
    { id: 44, text: "Manakah yang merupakan version control system selain Git?", options: ["Subversion (SVN)", "Docker", "Webpack", "Figma"] },
    { id: 45, text: "Apa itu REST API?", options: ["Arsitektur API berbasis HTTP dan resource", "Jenis database NoSQL", "Bahasa pemrograman baru", "Framework CSS"] },
    { id: 46, text: "Apa fungsi dari `npm install`?", options: ["Menginstal dependencies proyek", "Menjalankan server", "Membuat file baru", "Menghapus cache browser"] },
    { id: 47, text: "Manakah yang bukan termasuk HTTP status code sukses?", options: ["404", "200", "201", "204"] },
    { id: 48, text: "Apa itu environment variable?", options: ["Variabel konfigurasi di luar kode sumber", "Jenis fungsi matematika", "Nama library CSS", "Struktur data array"] },
    { id: 49, text: "Dalam proses code review pada tim pengembangan software, mengapa developer senior sering menekankan pentingnya penulisan kode yang readable dan konsisten mengikuti style guide, meskipun kode tersebut sudah berfungsi dengan benar secara teknis?", options: ["Karena kode akan dibaca dan dipelihara oleh banyak orang dalam jangka panjang, sehingga keterbacaan dan konsistensi mengurangi risiko bug serta mempercepat proses debugging dan kolaborasi tim", "Karena kode yang rapi berjalan lebih cepat", "Karena compiler mengharuskan format tertentu", "Karena style guide adalah aturan hukum"] },
    { id: 50, text: "Apa itu unit testing?", options: ["Pengujian bagian kecil kode secara terpisah", "Pengujian seluruh sistem sekaligus", "Pengujian tampilan visual saja", "Pengujian kecepatan internet"] },
]