import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { exec } from 'child_process';

function WatsatPlot() {
    const [data, setData] = useState([]);
    
    useEffect(() => {
        async function fetchData() {

            function getPythonData() {
                return new Promise((resolve, reject) => {
                    exec('python ss.py', (error, stdout, stderr) => {
                        if (error) {
                            reject(`Error al ejecutar el script de Python: ${error}`);
                            return;
                        }
                        
                        // Divide la salida por líneas y procesa cada línea
                        const [datesLine, viLine] = stdout.trim().split('\n');
                        const dates = datesLine.split(',');
                        const vi = viLine.split(',').map(parseFloat);
            
                        resolve({ dates, vi });
                    });
                });
            }

            getPythonData().then(output => {
                const dates = output.dates;
                const vi = output.vi;
            
                console.log("Fechas:", dates);
                console.log("Valores VI:", vi);

            // Datos para Plotly
                const trace = {
                    x: dates,
                    y: vi,
                    mode: 'lines',
                    name: 'Volumetric'
                };

                setData([trace]);
            }).catch(error => {
                console.error(error);
            });
   
            // Convertir DataFrame a arrays
            
        }

        fetchData();
    }, []);

    const layout = {
        title: 'Watsat Model',
        xaxis: {
            title: 'Fecha'
        },
        yaxis: {
            title: 'VI'
        }
    };

    return <Plot data={data} layout={layout} />;
}

export default WatsatPlot;
