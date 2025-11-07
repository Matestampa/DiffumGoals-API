const crypto = require('crypto');
const sharp = require('sharp');

const {GoalModel}=require("../../../db/mongodb");


async function countCurrentGoals(){
    let currentGoalsCount=await GoalModel.countDocuments();
    
    return currentGoalsCount;
}


//Determinar el color
/// Devuelve un color RGB que se distinga mucho de los colores de la imagen
/// y no pertenezca a ella.
async function get_diffumColor(imgBuffer){
   // Reducir la imagen para hacer el análisis rápido
     const resized = await sharp(imgBuffer)
       .resize(64, 64, { fit: 'inside' })
       .removeAlpha()
       .raw()
       .toBuffer({ resolveWithObject: true });
   
     const { data, info } = resized;
     const colors = new Set();
     const pixels = [];
   
     // Convertir a set de colores únicos
     for (let i = 0; i < data.length; i += 3) {
       const r = data[i];
       const g = data[i + 1];
       const b = data[i + 2];
       const key = `${r},${g},${b}`;
       if (!colors.has(key)) {
         colors.add(key);
         pixels.push([r, g, b]);
       }
     }
   
     // Generar candidatos — pueden ser random o fijos
     const candidates = [
       [255, 0, 0],
       [0, 255, 0],
       [0, 0, 255],
       [255, 255, 0],
       [0, 255, 255],
       [255, 0, 255],
       [255, 255, 255],
       [0, 0, 0],
       ...Array.from({ length: 30 }, () => [
         Math.floor(Math.random() * 256),
         Math.floor(Math.random() * 256),
         Math.floor(Math.random() * 256),
       ])
     ];
   
     // Función para calcular distancia euclidiana
     const dist = (c1, c2) => {
       const dr = c1[0] - c2[0];
       const dg = c1[1] - c2[1];
       const db = c1[2] - c2[2];
       return Math.sqrt(dr * dr + dg * dg + db * db);
     };
   
     let bestColor = null;
     let bestScore = -Infinity;
   
     for (const cand of candidates) {
       const key = cand.join(',');
       if (colors.has(key)) continue; // ya existe en la imagen
   
       // Calcular distancia promedio a todos los colores
       let total = 0;
       for (const p of pixels) total += dist(cand, p);
       const avgDist = total / pixels.length;
   
       if (avgDist > bestScore) {
         bestScore = avgDist;
         bestColor = cand;
       }
     }
   
     return [bestColor[0], bestColor[1], bestColor[2]];
}

//Calcular cant de pix a diffum x dia
function get_cant_pix_xday(total_imgPix,limit_date){
   let today=new Date();
   let future_date=new Date(limit_date);

  //Calculate date difference between dates
  let differenceInTime = future_date.getTime() - today.getTime();
  let differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
  
  //Return cant pix x day, rounded down.
  const result = Math.ceil(total_imgPix / differenceInDays);

  return result;
}

//hacer id para db y s3
function generateRand_MONGO_S3_ids(){
    
    let db_id=crypto.randomBytes(12).toString("hex");
    let s3_id=db_id+"_s3"

    return {db_id,s3_id};
}


module.exports={countCurrentGoals,
                get_diffumColor,
                get_cant_pix_xday,
                generateRand_MONGO_S3_ids};