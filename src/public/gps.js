//==================================================
// RAIO ADAPTATIVO
//==================================================

export function raioPermitido(accuracy){

    if (accuracy <= 8) return 200;

    if (accuracy <= 15) return 300;

    if (accuracy <= 25) return 400;

    return 500;

}

//==================================================
// DISTÂNCIA (HAVERSINE)
//==================================================

export function calcularDistancia(lat1, lon1, lat2, lon2){

    const R = 6371000;

    const dLat = (lat2-lat1) * Math.PI/180;

    const dLon = (lon2-lon1) * Math.PI/180;

    const a =

        Math.sin(dLat/2)*Math.sin(dLat/2)+

        Math.cos(lat1*Math.PI/180)*

        Math.cos(lat2*Math.PI/180)*

        Math.sin(dLon/2)*

        Math.sin(dLon/2);

    const c =

        2*Math.atan2(

            Math.sqrt(a),

            Math.sqrt(1-a)

        );

    return R*c;

}// Filename: public/gps.js

// Code written in public files is shared by your site's
// Backend, page code, and site code environments.

// Use public files to hold utility functions that can
// be called from multiple locations in your site's code.
export function add(param1, param2) {
	return param1 + param2;
}

// The following code demonstrates how to call the add
// function from your site's page code or site code.
/*
import {add} from 'public/gps.js'
$w.onReady(function () {
    let sum = add(6,7);
    console.log(sum);
});
*/