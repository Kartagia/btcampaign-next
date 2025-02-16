
"use client"
import { useState } from "react";

import MechCollectionScoring from "./MechCollectionScoring.jsx";


export default function CampaignScoring({ model, campaignName = undefined, onSave = undefined, onClose = undefined, minimizeOnClose = false }) {
    const [savedCampaign, setSavedCampaign] = useState(model);
    const [campaign, setCampaign] = useState(savedCampaign);
    const [saved, setSaved] = useState(true);
    const [open, setOpen] = useState("open");

    const save = (e) => {
        setSavedCampaign(campaign);
        if (onSave) {
            onSave(savedCampaign);
        }
        setSaved(true);
    }

    const reset = (e) => {
        setCampaign(savedCampaign);
        setSaved(true);
    }

    const close = (e) => {
        if (onClose) {
            onClose(e);
        }
        if (minimizeOnClose) {
            setOpen("title");
        } else {
            setOpen("none");
        }
    }

    const handleCollectionChange = (e) => {

    };

    return (<div hidden={(open == "none")}>
        <header hidden={(open == "none")}>Campaign scoring{campaignName && ` ${campaignName}`}</header>
        <main hidden={open != "open"}>
            <section name="mech collection">
                <MechCollectionScoring value={campaign.mechs} onChange={ handleCollectionChange} />
            </section>

        </main>
        <footer hidden={open != "open"} >
            <button name="save" disabled={onSave && !saved} onClick={(e) => { save() }} >Save</button>
            <button name="reset" disabled={saved} onClick={(e) => { reset() }}>Reset</button>
            <button name="close" onClick={(e) => { close(); }}>Close</button>
        </footer>
    </div>)
}