import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Backdrop , CircularProgress, TextField, Grid, Button} from '@material-ui/core';
import { AttachFile, Description, PictureAsPdf, Theaters } from '@material-ui/icons';
import { DropzoneArea } from 'material-ui-dropzone';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import emitter from '@utils/events.utils';
import shp from 'shpjs';



const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& .MuiDropzoneArea-root': {
      minHeight: '100px',
      maxHeight: '200px',
    }
  },
  fileDetails: {
    marginTop: theme.spacing(1),
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
    fontWeight: 'bold',
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
  checkBoxContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: '100%',
  },
  inputLabel: {
    marginBottom: theme.spacing(1),
  },
  dateInput: {
    width: '100%',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  foormControl: {
    margin: theme.spacing(3),
  },
  dropzone: {
    minHeight: '191px',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  progressText: {
    marginLeft: theme.spacing(2),
  },
}));

export default function ControlledAccordions({onSubmit}) {
  const classes = useStyles();
  const [, setNumericColumns] = useState([]);
  const [, setSelectedOption] = useState('rf');
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({
    rf: false,
    svm: false,
    knn: false,
    aoiDataFiles: [],
    startDate: "2000-04-14",
    endDate: "2024-05-14",
    satelliteData: {
      sentinel1: false,
      sentinel2: false,
      landsat: false,
    },
    indexes: {
      vegetationIndexes: false,
      brightnessIndexes: false,
      moistureIndexes: false,
    },
    modelFeatures: {
      numberOfTrees: 500,
      seed: 0.0001,
      bagFraction: 0,
    },
    performanceIndicators: {
      rsquare: false,
      rmse: false,
      mse: false,
      mae: false,
      rpiq: false,
    }
  });
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let timerInterval;
    if (loading) {
      timerInterval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else {
      clearInterval(timerInterval);
    }

    return () => clearInterval(timerInterval);
  }, [loading]);

  const handleChangeExp = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' || type === 'radio' ? checked : value
    }));
    if (name === "options") {
      setSelectedOption(value);
    }
  };

  const handleFileChange = (name, files) => {
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = await shp(event.target.result);
          const columns = data.features.length > 0 ? Object.keys(data.features[0].properties) : [];
          const numericColumns = columns.filter(key => typeof data.features[0].properties[key] === 'number');
          setNumericColumns(numericColumns);
        } catch (error) {
          console.error("Error processing shapefile", error);
        }
      };
      reader.readAsArrayBuffer(files[0]);
    }
    setFormData(prev => ({
      ...prev,
      [name]: files
    }));
    
  };

  const handlePreviewIcon = (fileObject, classes) => {
    const {type} = fileObject.file
    const iconProps = {
      className : classes.image,
    }
  
    if (type.startsWith("video/")) return <Theaters {...iconProps} />
  
    switch (type) {
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return <Description {...iconProps} />
      case "application/pdf":
        return <PictureAsPdf {...iconProps} />
      default:
        return <AttachFile {...iconProps} />
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setTimer(0); // Reset the timer when the submit button is clicked
      const data = new FormData();
      console.log(formData.endDate);
      data.append('aoiDataFiles', formData.aoiDataFiles[0]);
      data.append('startDate', formData.startDate);
      data.append('endDate', formData.endDate);
      console.log(formData)
      for (const key in formData.satelliteData) {
        data.append(key, formData.satelliteData[key]);
      }

      for (const key in formData.indexes) {
        data.append(key, formData.indexes[key]);
      }

      for (const key in formData.modelFeatures) {
        data.append(key, formData.modelFeatures[key]);
      }

      for (const key in formData.performanceIndicators) {
        data.append(key, formData.performanceIndicators[key]);
      }
      
      console.log(data);

      const response = await fetch('http://localhost:5004/api/rusle', {
         method: 'POST',
         body: data
      });

      const result = await response.json();
      if(result){
        console.log('Data sent successfully', result);
        onSubmit(result.output);
        setLoading(false);
        emitter.emit('closeAllController');
        emitter.emit('openLayerController');
      }


    } catch (error) {
      setLoading(false);
      emitter.emit('showSnackbar', 'error', `Error: '${error}'`);
      console.error('Failed to send data', error);
    }
  };

  return (
    <div className={classes.root}>
      <Accordion expanded={expanded === 'panel2'} onChange={handleChangeExp('panel2')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2bh-content"
          id="panel2bh-header"
        >
          <Typography className={classes.heading}>Upload Files</Typography>
        </AccordionSummary>
        <AccordionDetails>
          

          <DropzoneArea
            onChange={(files) => handleFileChange('aoiDataFiles', files)}
            acceptedFiles={['.zip']}
            dropzoneText="Area of Interest"
            maxFileSize={5000000}
            filesLimit={1}
            getPreviewIcon={handlePreviewIcon}
            />
        </AccordionDetails>
      </Accordion>
      
      <Accordion expanded={expanded === 'panel3'} onChange={handleChangeExp('panel3')}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3bh-content"
          id="panel3bh-header"
        >
          <Typography className={classes.heading}>Dates</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={10}>
              <TextField
                label="Start Date"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={classes.dateInput}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                label="End Date"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={classes.dateInput}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      <div>


      </div>
      <div>


      </div>
      <Button onClick={handleSubmit} color="primary" variant="contained">Submit Data</Button>
      <Backdrop className={classes.backdrop} open={loading}>
        <CircularProgress color="inherit" />
        <Typography variant="h6" className={classes.progressText}>
          Loading... {timer}s
        </Typography>
      </Backdrop>
    </div>
  );
}
