const CHIAVE_ARCHIVIO = "ricettarioDolceEGolosoV3";
const NUMERO_COLONNE = 7;
const RIGHE_INIZIALI = 5;

const ricettaIniziale = {
    nome: "Nocciola",
    categoria: "creme",
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

function salvaArchivio() {
    localStorage.setItem(
        CHIAVE_ARCHIVIO,
        JSON.stringify(ricette)
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

    ricette[indiceCorrente] = {
        ...ricette[indiceCorrente],
        nome: nuovoNome,
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
    window.print();
});

ricerca.addEventListener("input", cercaRicetta);
categoria.addEventListener("change", cercaRicetta);

mostraRicetta(indiceCorrente);