$w.onReady(function () {

    $w("#html1").onMessage((event)=>{

        if(event.data !== "ready")
            return;

        const pontos = [

            {
                x:$w("#btn1").left + $w("#btn1").width/2,
                y:$w("#btn1").top + $w("#btn1").height/2
            },

            {
                x:$w("#btn2").left + $w("#btn2").width/2,
                y:$w("#btn2").top + $w("#btn2").height/2
            },

            {
                x:$w("#btn3").left + $w("#btn3").width/2,
                y:$w("#btn3").top + $w("#btn3").height/2
            }

        ];

        console.log(pontos);

        $w("#html1").postMessage(pontos);

    });

});