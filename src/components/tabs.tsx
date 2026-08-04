function Tabs() {
    return (
        <div className="tabs tabs-box" >
            <input type="radio" name="my_tabs_1" className="tab" aria-label="Tab 1" />
            <input type="radio" name="my_tabs_1" className="tab" aria-label="Tab 2" defaultChecked />
            <input type="radio" name="my_tabs_1" className="tab" aria-label="Tab 3" />
        </div >
    );
}

export default Tabs;