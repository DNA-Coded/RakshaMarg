const axios = require('axios');

const req = {
    method: 'GET',
    url: 'http://localhost:3000/api/v1/navigation/route',
    params: {
        origin: 'Delhi',
        destination: 'Mumbai'
    },
    headers: {
        'x-api-key': 'rakshamarg-dwklhfdewhff-efjjefwoihjfohgn'
    }
}

axios(req)
    .then(response => {
        const data = JSON.stringify(response.data);
        console.log(Object.keys(data));
    })
    .catch(error => {
        console.error(error);
    });
