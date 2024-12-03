import React, { useState } from 'react';
import { TextField, Button, Card, CardContent } from '@mui/material';
import DataDisplay from '../componentsJS/DataDisplay';

function CadastralSearch({ onSubmit }) {
    const [parcela, setParcela] = useState('');
    const [provincia, setProvincia] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [poligono, setPoligono] = useState('');
    const [recintoNum, setRecintoNum] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false); 

    // Función para enviar datos al backend
    const handleSubmit = async () => {
        setLoading(true);

        // Rellena ceros a la izquierda si es necesario
        const provinciaFormatted = provincia.padStart(2, '0');
        const municipioFormatted = municipio.padStart(3, '0');
        const poligonoFormatted = poligono.padStart(3, '0');
        const parcelaFormatted = parcela.padStart(5, '0');

        // Combinar todo en el formato correcto con la 'A' en la posición correcta
        const cadastralRef = `${provinciaFormatted}${municipioFormatted}A${poligonoFormatted}${parcelaFormatted}`;

        const apiUrl = `http://localhost:5004/cadastral/${cadastralRef}`;
        const queryParams = `?recintoNum=${recintoNum}`;

        try {
            const response = await fetch(`${apiUrl}${queryParams}`);
            const data = await response.json();
            console.log(data)
            onSubmit(data.output);    
            setResult(data.parcelInfo);
            setShowResults(true);
        } catch (error) {
            console.error("Error fetching data: ", error);
            setResult({ error: "Failed to fetch data" });
        }

        setLoading(false);
    };    
    const handleBack = () => {
        setShowResults(false); // Ocultar los resultados y mostrar de nuevo el formulario
    };

    return (
        <div>
        {!showResults ? (
            <Card style={{ maxWidth: 500, margin: '20px auto' }}>
    <CardContent>
        <TextField
            fullWidth
            label="Provincia"
            variant="outlined"
            value={provincia}
            onChange={e => setProvincia(e.target.value)}
            style={{ marginBottom: 16 }}
        />
        <TextField
            fullWidth
            label="Municipio"
            variant="outlined"
            value={municipio}
            onChange={e => setMunicipio(e.target.value)}
            style={{ marginBottom: 16 }}
        />
        <TextField
            fullWidth
            label="Polígono"
            variant="outlined"
            value={poligono}
            onChange={e => setPoligono(e.target.value)}
            style={{ marginBottom: 16 }}
        />
        <TextField
            fullWidth
            label="Parcela"
            variant="outlined"
            value={parcela}
            onChange={e => setParcela(e.target.value)}
            style={{ marginBottom: 16 }}
        />
        <TextField
            fullWidth
            label="Número del Recinto"
            variant="outlined"
            value={recintoNum}
            onChange={e => setRecintoNum(e.target.value)}
            style={{ marginBottom: 16 }}
        />
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading}>
            Submit
        </Button>
    </CardContent>
</Card>

        ) : (
            <DataDisplay data={result} onBack={handleBack} />
        )}
    </div>

    );
}

export default CadastralSearch;