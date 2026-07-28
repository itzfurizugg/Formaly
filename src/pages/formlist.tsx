import Card from "../components/card";

function FormList() {
    return (
        <div className="flex flex-col items-center">
            <h1 className="font-bold mb-10 justify-start text-accentTwo">Form anda</h1>
            <div className="m-5">
                <Card />
                <Card />
                <Card />
                <Card />
                <Card />
                <Card />
                <Card />
                <Card />
                <Card />
            </div>
        </div>
    );
}

export default FormList;