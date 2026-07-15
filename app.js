import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyAF-4PKBZ48oB3zeacu_KuctKoHxMljQEo",
    authDomain: "dolce-e-goloso.firebaseapp.com",
    projectId: "dolce-e-goloso",
    storageBucket: "dolce-e-goloso.firebasestorage.app",
    messagingSenderId: "91909515843",
    appId: "1:91909515843:web:aebecb3128a37072dac2f6"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const providerGoogle = new GoogleAuthProvider();
const CHIAVE_ARCHIVIO = "ricettarioDolceEGolosoV3";
const RACCOLTA_FIREBASE = "dolceEGoloso";
const DOCUMENTO_FIREBASE = "ricettario";
const riferimentoArchivioFirebase = doc(
    db,
    RACCOLTA_FIREBASE,
    DOCUMENTO_FIREBASE
);
const NUMERO_COLONNE = 7;
const INTESTAZIONI_PREDEFINITE = [
    "3 kg",
    "3,5 kg",
    "4 kg",
    "4,5 kg",
    "5 kg",
    "5,5 kg",
    "6 kg"
];
const RIGHE_INIZIALI = 5;

const ricettaIniziale = {
    nome: "Nocciola",
    categoria: "creme",
    intestazioni: [...INTESTAZIONI_PREDEFINITE],
    ingredienti: creaRigheVuote(RIGHE_INIZIALI)
};

let ricette = caricaRicette();
let indiceCorrente = 0;
let modalitaModifica = false;

const nomeRicetta = document.getElementById("nomeRicetta");
const corpoTabella = document.querySelector("tbody");
const ricerca = document.getElementById("ricerca");
const categoria = document.getElementById("categoria");

const bottoneNuova = document.getElementById("nuovaRicetta");
const bottonePrecedente = document.getElementById("precedente");
const bottoneModifica = document.getElementById("modifica");
const bottoneStampa = document.getElementById("stampa");
const bottoneSuccessiva = document.getElementById("successiva");

const contenitoreAzioniIngredienti = document.createElement("div");
contenitoreAzioniIngredienti.className = "azioni-ingredienti";
contenitoreAzioniIngredienti.innerHTML = `
    <button type="button" id="aggiungiIngrediente">
        + Aggiungi ingrediente
    </button>

    <button type="button" id="eliminaIngrediente">
        − Elimina ultima riga
    </button>
`;

document
    .querySelector(".tabella-contenitore")
    .insertAdjacentElement(
        "afterend",
        contenitoreAzioniIngredienti
    );

const bottoneAggiungiIngrediente =
    document.getElementById("aggiungiIngrediente");

const bottoneEliminaIngrediente =
    document.getElementById("eliminaIngrediente");

function creaIngredienteVuoto() {
    return {
        nome: "",
        quantita: Array(NUMERO_COLONNE).fill("")
    };
}

function creaRigheVuote(numero) {
    return Array.from(
        { length: numero },
        () => creaIngredienteVuoto()
    );
}

function normalizzaIngredienti(ingredienti) {
    if (!Array.isArray(ingredienti)) {
        return creaRigheVuote(RIGHE_INIZIALI);
    }

    const righe = ingredienti
        .filter((ingrediente) => {
            const nome = String(
                ingrediente?.nome ?? ""
            ).trim().toLowerCase();

            return nome !== "base";
        })
        .map((ingrediente) => ({
            nome: String(ingrediente?.nome ?? ""),
            quantita: Array.from(
                { length: NUMERO_COLONNE },
                (_, indice) =>
                    String(
                        ingrediente?.quantita?.[indice] ?? ""
                    )
            )
        }));

    while (righe.length < RIGHE_INIZIALI) {
        righe.push(creaIngredienteVuoto());
    }

    return righe;
}

function normalizzaRicetta(ricetta) {
    return {
        nome: String(ricetta?.nome || "Nuova ricetta"),
        categoria: String(ricetta?.categoria || "creme"),
        intestazioni: Array.isArray(ricetta?.intestazioni)
            ? ricetta.intestazioni
            : [...INTESTAZIONI_PREDEFINITE],
        ingredienti: normalizzaIngredienti(
            ricetta?.ingredienti
        )
    };
}

function caricaRicette() {
    try {
        const archivio =
            localStorage.getItem(CHIAVE_ARCHIVIO);

        if (!archivio) {
            return [normalizzaRicetta(ricettaIniziale)];
        }

        const dati = JSON.parse(archivio);

        if (!Array.isArray(dati) || dati.length === 0) {
            return [normalizzaRicetta(ricettaIniziale)];
        }

        return dati.map(normalizzaRicetta);
    } catch (errore) {
        console.error("Errore caricamento ricette:", errore);
        return [normalizzaRicetta(ricettaIniziale)];
    }
}

async function salvaArchivio() {
    localStorage.setItem(
        CHIAVE_ARCHIVIO,
        JSON.stringify(ricette)
    );

    try {
        await setDoc(
            riferimentoArchivioFirebase,
            {
                ricette: ricette,
                ultimoAggiornamento: new Date().toISOString()
            },
            { merge: true }
        );

        console.log("Archivio sincronizzato con Firebase.");
    } catch (errore) {
        console.error(
            "Salvataggio Firebase non riuscito. La copia locale è comunque salva:",
            errore
        );
    }
}
function avviaSincronizzazioneFirebase() {
    onSnapshot(
        riferimentoArchivioFirebase,
        async (documento) => {
            if (!documento.exists()) {
                try {
                    await setDoc(riferimentoArchivioFirebase, {
                        ricette,
                        ultimoAggiornamento: new Date().toISOString()
                    });

                    console.log(
                        "Archivio Firebase creato con le ricette presenti."
                    );
                } catch (errore) {
                    console.error(
                        "Errore creazione archivio Firebase:",
                        errore
                    );
                }

                return;
            }

            const datiFirebase = documento.data();

            if (
                !Array.isArray(datiFirebase.ricette) ||
                datiFirebase.ricette.length === 0
            ) {
                return;
            }

            ricette = datiFirebase.ricette.map(normalizzaRicetta);

            localStorage.setItem(
                CHIAVE_ARCHIVIO,
                JSON.stringify(ricette)
            );

            if (indiceCorrente >= ricette.length) {
                indiceCorrente = 0;
            }

            mostraRicetta(indiceCorrente);

            console.log(
                "Ricette aggiornate da Firebase."
            );
        },
        (errore) => {
            console.error(
                "Errore sincronizzazione Firebase:",
                errore
            );
        }
    );
}
function creaRigaIngrediente(ingrediente) {
    const riga = document.createElement("tr");

    const cellaNome = document.createElement("th");
    cellaNome.textContent = ingrediente.nome;
    riga.appendChild(cellaNome);

    ingrediente.quantita.forEach((quantita) => {
        const cella = document.createElement("td");
        cella.textContent = quantita;
        riga.appendChild(cella);
    });

    return riga;
}

function mostraRicetta(indice) {
    if (ricette.length === 0) {
        return;
    }

    if (indice < 0) {
        indice = ricette.length - 1;
    }

    if (indice >= ricette.length) {
        indice = 0;
    }

    indiceCorrente = indice;
    modalitaModifica = false;

    const ricetta = ricette[indiceCorrente];
    const celleIntestazione = document.querySelectorAll("#intestazioneTabella th");

ricetta.intestazioni.forEach((testo, indice) => {
    if (celleIntestazione[indice + 1]) {
        celleIntestazione[indice + 1].textContent = testo;
    }
});

    nomeRicetta.textContent = ricetta.nome;
    corpoTabella.innerHTML = "";

    ricetta.ingredienti.forEach((ingrediente) => {
        corpoTabella.appendChild(
            creaRigaIngrediente(ingrediente)
        );
    });

    disattivaModifica();
    bottoneModifica.textContent = "✎ Modifica";
    aggiornaPulsantiIngredienti();
}

function attivaModifica() {
    modalitaModifica = true;

    nomeRicetta.contentEditable = "true";
    nomeRicetta.classList.add("campo-modificabile");
    document
    .querySelectorAll("#intestazioneTabella th:not(:first-child)")
    .forEach((cella) => {
        cella.contentEditable = "true";
        cella.classList.add("campo-modificabile");
    });

    corpoTabella
        .querySelectorAll("th, td")
        .forEach((cella) => {
            cella.contentEditable = "true";
            cella.classList.add("campo-modificabile");
        });

    bottoneModifica.textContent = "💾 Salva";
    aggiornaPulsantiIngredienti();
    nomeRicetta.focus();
}

function disattivaModifica() {
    nomeRicetta.contentEditable = "false";
    nomeRicetta.classList.remove("campo-modificabile");
    document
    .querySelectorAll("#intestazioneTabella th:not(:first-child)")
    .forEach((cella) => {
        cella.contentEditable = "false";
        cella.classList.remove("campo-modificabile");
    });

    corpoTabella
        .querySelectorAll("th, td")
        .forEach((cella) => {
            cella.contentEditable = "false";
            cella.classList.remove("campo-modificabile");
        });

    aggiornaPulsantiIngredienti();
}

function aggiornaPulsantiIngredienti() {
    contenitoreAzioniIngredienti.style.display =
        modalitaModifica ? "flex" : "none";
}

function leggiIngredientiDallaTabella() {
    return Array.from(
        corpoTabella.querySelectorAll("tr")
    ).map((riga) => ({
        nome: riga.querySelector("th").textContent.trim(),
        quantita: Array.from(
            riga.querySelectorAll("td")
        ).map((cella) => cella.textContent.trim())
    }));
}

function salvaModifiche() {
    const nuovoNome = nomeRicetta.textContent.trim();

    if (!nuovoNome) {
        alert("Inserisci il nome della ricetta.");
        nomeRicetta.focus();
        return;
    }

  const intestazioni = Array.from(
    document.querySelectorAll("#intestazioneTabella th")
)
.slice(1)
.map(cella => cella.textContent.trim());

ricette[indiceCorrente] = {
    ...ricette[indiceCorrente],
    nome: nuovoNome,
    intestazioni,
    ingredienti: leggiIngredientiDallaTabella()
}; 

    salvaArchivio();

    modalitaModifica = false;
    disattivaModifica();
    bottoneModifica.textContent = "✎ Modifica";

    alert("Ricetta salvata.");
}

function aggiungiIngrediente() {
    if (!modalitaModifica) {
        return;
    }

    const nuovaRiga = creaRigaIngrediente(
        creaIngredienteVuoto()
    );

    corpoTabella.appendChild(nuovaRiga);

    nuovaRiga
        .querySelectorAll("th, td")
        .forEach((cella) => {
            cella.contentEditable = "true";
            cella.classList.add("campo-modificabile");
        });

    nuovaRiga.querySelector("th").focus();
}

function eliminaUltimaRiga() {
    if (!modalitaModifica) {
        return;
    }

    const righe = corpoTabella.querySelectorAll("tr");

    if (righe.length <= 1) {
        alert("Deve rimanere almeno una riga.");
        return;
    }

    righe[righe.length - 1].remove();
}

function creaNuovaRicetta() {
    const nome = prompt("Nome della nuova ricetta:");

    if (nome === null) {
        return;
    }

    const nomePulito = nome.trim();

    if (!nomePulito) {
        alert("Inserisci il nome della ricetta.");
        return;
    }

    const categoriaScelta = prompt(
        "Categoria: basi, creme, frutta, granite o semifreddi",
        "creme"
    );

    if (categoriaScelta === null) {
        return;
    }

    const categorieValide = [
        "basi",
        "creme",
        "frutta",
        "granite",
        "semifreddi"
    ];

    const valoreCategoria = categoriaScelta
        .trim()
        .toLowerCase();

    const nuovaRicetta = {
        nome: nomePulito,
        categoria: categorieValide.includes(valoreCategoria)
            ? valoreCategoria
            : "creme",
           intestazioni: [...INTESTAZIONI_PREDEFINITE], 
        ingredienti: creaRigheVuote(RIGHE_INIZIALI)
    };

    ricette.push(nuovaRicetta);
    indiceCorrente = ricette.length - 1;

    salvaArchivio();
    mostraRicetta(indiceCorrente);
    attivaModifica();
}

function cercaRicetta() {
    const testo = ricerca.value.trim().toLowerCase();
    const filtroCategoria = categoria.value;

    const indice = ricette.findIndex((ricetta) => {
        const nomeCorrisponde = ricetta.nome
            .toLowerCase()
            .includes(testo);

        const categoriaCorrisponde =
            filtroCategoria === "tutte" ||
            ricetta.categoria === filtroCategoria;

        return nomeCorrisponde && categoriaCorrisponde;
    });

    if (indice !== -1) {
        mostraRicetta(indice);
    }
}

bottoneNuova.addEventListener("click", creaNuovaRicetta);

bottoneModifica.addEventListener("click", () => {
    if (modalitaModifica) {
        salvaModifiche();
    } else {
        attivaModifica();
    }
});

bottoneAggiungiIngrediente.addEventListener(
    "click",
    aggiungiIngrediente
);

bottoneEliminaIngrediente.addEventListener(
    "click",
    eliminaUltimaRiga
);

bottonePrecedente.addEventListener("click", () => {
    mostraRicetta(indiceCorrente - 1);
});

bottoneSuccessiva.addEventListener("click", () => {
    mostraRicetta(indiceCorrente + 1);
});

bottoneStampa.addEventListener("click", () => {
    window.print();F
});

ricerca.addEventListener("input", cercaRicetta);
categoria.addEventListener("change", cercaRicetta);

mostraRicetta(indiceCorrente);
avviaSincronizzazioneFirebase();
const PASSWORD_RICETTARIO = "dolce2009";

const schermataAccesso =
    document.getElementById("schermataAccesso");

const campoPassword =
    document.getElementById("campoPassword");

const pulsanteAccesso =
    document.getElementById("pulsanteAccesso");

const errorePassword =
    document.getElementById("errorePassword");

function provaAccesso() {
    const passwordInserita = campoPassword.value.trim();

    if (passwordInserita === PASSWORD_RICETTARIO) {
        schermataAccesso.classList.add("nascosta");
        errorePassword.textContent = "";
        campoPassword.value = "";
        return;
    }

    errorePassword.textContent = "Password non corretta.";
    campoPassword.select();
}

pulsanteAccesso.addEventListener("click", provaAccesso);

campoPassword.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        provaAccesso();
    }
});

campoPassword.focus();