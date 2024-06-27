import React, { useState } from 'react';
import { TextField, Button, Card, CardContent } from '@mui/material';
import DataDisplay from '../componentsJS/DataDisplay';

function CadastralSearch({ onSubmit }) {
    const [cadastralRef, setCadastralRef] = useState('');
    const [recintoNum, setRecintoNum] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false); 

    const handleSubmit = async () => {
        setLoading(true);
        const ref = cadastralRef.replace(/\s/g, '');
        const apiUrl = `http://localhost:5005/cadastral/${ref}`;
        const queryParams = `?recintoNum=${recintoNum}`;
        try {
            const response = await fetch(`${apiUrl}${queryParams}`);
            const data = await response.json();
            setResult(data['parcelInfo']);
            setShowResults(true);
            onSubmit(data['geojson'])
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
                        label="Ref. Catastral"
                        variant="outlined"
                        value={cadastralRef}
                        onChange={e => setCadastralRef(e.target.value)}
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