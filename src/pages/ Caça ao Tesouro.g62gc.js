   import wixWindow from 'wix-window';

   //==================================================
   // CONFIGURAÇÃO DA MISSÃO
   //==================================================

   const missao = {

      nome: "Tesouro Teste",

      pontos: {

         "1": {

               latitude: -30.059668,
               longitude: -51.168383,

               conteudo: {

                  tipo: "youtube",
                  titulo: "Portal da Coruja",
                  mensagem: "Parabéns Exploradores!",
                  valor: "fE0XxFWt16M"

               }

         },

         "2": {

               latitude: -30.059400,
               longitude: -51.168000,

               conteudo: {

                  tipo: "texto",
                  titulo: "Segundo Portal",
                  mensagem: "Vocês encontraram o segundo ponto!",
                  valor: ""

               }

         }

      }

   };

   //==================================================
   // BOTÕES
   //==================================================

   const botoes = {

      "#btnPonto1": "1",
      "#btnPonto2": "2"

   };

   //==================================================
   // INICIALIZAÇÃO
   //==================================================

   $w.onReady(function () {

      Object.entries(botoes).forEach(([botao,id])=>{

         $w(botao).onClick(()=>{

               verificarPonto(id);

         });

      });

   });

   //==================================================
   // MOTOR
   //==================================================

   async function verificarPonto(id){

      const ponto = missao.pontos[id];

      try{

         const location = await wixWindow.getCurrentGeolocation();

         const lat = location.coords.latitude;
         const lng = location.coords.longitude;
         const accuracy = location.coords.accuracy;

         const distancia = calcularDistancia(

               lat,
               lng,

               ponto.latitude,
               ponto.longitude

         );

         const raio = raioPermitido(accuracy);

         if(distancia <= raio){

               $w("#txtResultado").text =
                  "✅ Local encontrado!";

               mostrarConteudo(ponto.conteudo);

         }

         else{

               $w("#txtResultado").text =

   `❌ Ainda não...

   Distância: ${Math.round(distancia)} m

   Precisão GPS: ${Math.round(accuracy)} m

   Raio aceito: ${raio} m`;

         }

      }

      catch(err){

         $w("#txtResultado").text = err.message;

      }

   }

   //==================================================
   // ABRIR LIGHTBOX
   //==================================================

   function mostrarConteudo(conteudo){

      console.log("Abrindo lightbox...");

      wixWindow.openLightbox("Conteudo", conteudo)
         .then(() => {
               console.log("Lightbox fechada");
         })
         .catch((err) => {
               console.error(err);
         });

   }

   //==================================================
   // RAIO ADAPTATIVO
   //==================================================

   function raioPermitido(accuracy){

      if(accuracy<=8) return 100;

      if(accuracy<=15) return 150;

      if(accuracy<=25) return 200;

      return 400;

   }

   //==================================================
   // DISTÂNCIA
   //==================================================

   function calcularDistancia(lat1,lon1,lat2,lon2){

      const R=6371000;

      const dLat=(lat2-lat1)*Math.PI/180;

      const dLon=(lon2-lon1)*Math.PI/180;

      const a=

      Math.sin(dLat/2)*Math.sin(dLat/2)+

      Math.cos(lat1*Math.PI/180)*

      Math.cos(lat2*Math.PI/180)*

      Math.sin(dLon/2)*

      Math.sin(dLon/2);

      const c=

      2*Math.atan2(

         Math.sqrt(a),

         Math.sqrt(1-a)

      );

      return R*c;

   }