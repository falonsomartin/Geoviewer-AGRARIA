import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Grid, Tabs, Tab, Box } from '@mui/material';
import PropTypes from 'prop-types';

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

const MyComponent = () => {
    const [tabValue, setTabValue] = useState(0);

    // General states
    const [riegoAportado, setRiegoAportado] = useState('');
    const [ufn, setUfn] = useState('');
    const [ufp, setUfp] = useState('');
    const [ufk, setUfk] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Precipitation states
    const [precMax, setPrecMax] = useState('');

    // Temperature states
    const [tempMean, setTempMean] = useState('');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [metrics, setMetrics] = useState(null); // Para R², RMSE, MAE

    // Handle tab change
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

     // Function to submit data
     const handlePredict = async () => {
        setLoading(true);

        const data = {
            riegoAportado: parseFloat(riegoAportado),
            ufn: parseFloat(ufn),
            ufp: parseFloat(ufp),
            ufk: parseFloat(ufk),
            precMax: parseFloat(precMax),
            tempMean: parseFloat(tempMean),
            startDate: startDate ? new Date(startDate).toISOString() : null, // Formato ISO
            endDate: endDate ? new Date(endDate).toISOString() : null,       // Formato ISO    
        };

        try {
            const response = await fetch('http://localhost:5004/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log(result)
            setResult(result.prediction.prediction);
            setMetrics(result.prediction.model_metrics); // Guardar las métricas recibidas
        } catch (err) {
            console.error('Error:', err);
        }

        setLoading(false);
    };

    const commonFields = (
        <>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    fullWidth
                    label="RIEGO APORTADO (M3TOTAL/HA)"
                    variant="outlined"
                    value={riegoAportado}
                    onChange={e => setRiegoAportado(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    fullWidth
                    label="UFN (TOTALES/HA)"
                    variant="outlined"
                    value={ufn}
                    onChange={e => setUfn(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    fullWidth
                    label="UFP (TOTALES/HA)"
                    variant="outlined"
                    value={ufp}
                    onChange={e => setUfp(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    fullWidth
                    label="UFK (TOTALES/HA)"
                    variant="outlined"
                    value={ufk}
                    onChange={e => setUfk(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    fullWidth
                    label="Fecha de inicio"
                    type="date"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    fullWidth
                    label="Fecha de fin"
                    type="date"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
            </Grid>
        </>
    );

    return (
        <Card style={{ maxWidth: 1200, margin: '20px auto' }}>
            <CardContent>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="Tabs for different inputs">
                    <Tab label="General" />
                    <Tab label="Precipitación" />
                    <Tab label="Temperatura" />
                </Tabs>

                {/* General Tab Panel */}
                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={2}>
                        {commonFields}
                    </Grid>
                </TabPanel>

                {/* Precipitation Tab Panel */}
                <TabPanel value={tabValue} index={1}>
                    <Grid container spacing={2}>
                        {commonFields}
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Precipitación Máxima"
                                variant="outlined"
                                value={precMax}
                                onChange={e => setPrecMax(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Temperature Tab Panel */}
                <TabPanel value={tabValue} index={2}>
                    <Grid container spacing={2}>
                        {commonFields}
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Temperatura Media"
                                variant="outlined"
                                value={tempMean}
                                onChange={e => setTempMean(e.target.value)}
                            />
                        </Grid>

                    </Grid>
                </TabPanel>

                {/* Submit Button */}
                <Button variant="contained" color="primary" onClick={handlePredict} disabled={loading} style={{ marginTop: 20 }}>
                    {loading ? 'Loading...' : 'Submit'}
                </Button>
            </CardContent>

           {/* Display Prediction Result */}
           {result && (
                <CardContent>
                    <p>Predicción: {result} t de almendra/Ha.</p>
                    {metrics && (
                        <>
                            <p>R²: {metrics.r2_score}</p>
                            <p>RMSE: {metrics.rmse}</p>
                            <p>MAE: {metrics.mae}</p>
                        </>
                    )}
                </CardContent>
            )}
        </Card>
    );
};

export default MyComponent;