import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Grid, MenuItem, Select, FormControl, InputLabel } from '@mui/material'; // Importamos Select y FormControl

const MyComponent = () => {
    // Estados para las diferentes variables
    const [ETO_med, setETO_med] = useState('');
    const [ETO_min, setETO_min] = useState('');
    const [ETO_max, setETO_max] = useState('');
    const [PREC_med, setPREC_med] = useState('');
    const [RAD_med, setRAD_med] = useState('');
    const [HUM_med, setHUM_med] = useState('');
    const [Tmed, setTmed] = useState('');
    const [Tmin, setTmin] = useState('');
    const [Tmax, setTmax] = useState('');
    const [UFK, setUFK] = useState('');
    const [UFP, setUFP] = useState('');
    const [UFN, setUFN] = useState('');
    const [ZONA_VULNERABLE_A_NITROGENO, setZonaVulnerable] = useState('');
    const [RIEGO_DEFICITARIO, setRiegoDeficitario] = useState('');
    const [TEXTURA, setTextura] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // Función para manejar la solicitud POST
    const handlePredict = async () => {
        setLoading(true);
        
        // Datos que se enviarán en la solicitud POST
        const data = {
            "ETO_med": parseFloat(ETO_med),
            "ETO_min": parseFloat(ETO_min),
            "ETO_max": parseFloat(ETO_max),
            "PREC_med": parseFloat(PREC_med),
            "RAD_med": parseFloat(RAD_med),
            "HUM_med": parseFloat(HUM_med),
            "Tmed": parseFloat(Tmed),
            "Tmin": parseFloat(Tmin),
            "Tmax": parseFloat(Tmax),
            "UFK(LN)": parseFloat(UFK),
            "UFP(LN)": parseFloat(UFP),
            "UFN(LN)": parseFloat(UFN),
            "ZONA_VULNERABLE_A_NITROGENO": parseFloat(ZONA_VULNERABLE_A_NITROGENO),
            "RIEGO_DEFICITARIO": parseFloat(RIEGO_DEFICITARIO),
            "TEXTURA": parseFloat(TEXTURA)
        };

        try {
            // Realizar la solicitud fetch a la API de Flask
            const response = await fetch('http://localhost:5003/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data), // Convertir los datos a JSON
            });

            const result = await response.json(); // Obtener la respuesta JSON
            setResult(result.prediction); // Almacenar la predicción en el estado
        } catch (err) {
            console.error('Error:', err);
        }

        setLoading(false);
    };

    return (
        <Card style={{ maxWidth: 1200, margin: '20px auto' }}>
            <CardContent>
                {/* Usamos Grid para organizar las entradas */}
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="ETO_med" variant="outlined" value={ETO_med} onChange={e => setETO_med(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="ETO_min" variant="outlined" value={ETO_min} onChange={e => setETO_min(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="ETO_max" variant="outlined" value={ETO_max} onChange={e => setETO_max(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="PREC_med" variant="outlined" value={PREC_med} onChange={e => setPREC_med(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="RAD_med" variant="outlined" value={RAD_med} onChange={e => setRAD_med(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="HUM_med" variant="outlined" value={HUM_med} onChange={e => setHUM_med(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="Tmed" variant="outlined" value={Tmed} onChange={e => setTmed(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="Tmin" variant="outlined" value={Tmin} onChange={e => setTmin(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="Tmax" variant="outlined" value={Tmax} onChange={e => setTmax(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="UFK(LN)" variant="outlined" value={UFK} onChange={e => setUFK(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="UFP(LN)" variant="outlined" value={UFP} onChange={e => setUFP(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="UFN(LN)" variant="outlined" value={UFN} onChange={e => setUFN(e.target.value)} />
                    </Grid>

                    {/* Select para ZONA VULNERABLE A NITRÓGENO */}
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>ZONA VULNERABLE A NITRÓGENO</InputLabel>
                            <Select
                                value={ZONA_VULNERABLE_A_NITROGENO}
                                onChange={e => setZonaVulnerable(e.target.value)}
                                label="ZONA VULNERABLE A NITRÓGENO"
                            >
                                <MenuItem value={1}>Sí</MenuItem>
                                <MenuItem value={0}>No</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Select para RIEGO DEFICITARIO */}
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>RIEGO DEFICITARIO</InputLabel>
                            <Select
                                value={RIEGO_DEFICITARIO}
                                onChange={e => setRiegoDeficitario(e.target.value)}
                                label="RIEGO DEFICITARIO"
                            >
                                <MenuItem value={1}>Sí</MenuItem>
                                <MenuItem value={0}>No</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Select para TEXTURA */}
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>TEXTURA</InputLabel>
                            <Select
                                value={TEXTURA}
                                onChange={e => setTextura(e.target.value)}
                                label="TEXTURA"
                            >
                                <MenuItem value={0}>FRANCO-ARCILLOSO</MenuItem>
                                <MenuItem value={1}>ARCILLOSO</MenuItem>
                                <MenuItem value={2}>FRANCO-ARCILLOSO-ARENOSO</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* Botón para enviar la solicitud */}
                <Button variant="contained" color="primary" onClick={handlePredict} disabled={loading} style={{ marginTop: 20 }}>
                    {loading ? 'Loading...' : 'Submit'}
                </Button>
            </CardContent>

            {/* Mostrar el resultado */}
            {result && <CardContent><p>Predicción: {result}</p></CardContent>}
        </Card>
    );
};

export default MyComponent;