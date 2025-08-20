const crypto = require('crypto');



//determinar el color
function get_diffumColor(imgBuffer){
   return [0,0,0];
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

//Crear array o traerlo
function get_untouchedPixArr(width,height){
    let pixelCoords=[];

     for (let y = 0; y < height; y++) {
        for (let x=0;x<width;x++){
          pixelCoords.push([x,y]);
        }
    }
    return pixelCoords
}


//hacer id para db y s3
function generateRand_MONGO_S3_ids(){
    
    let db_id=crypto.randomBytes(12).toString("hex");
    let s3_id=db_id+"_s3"

    return {db_id,s3_id};
}


module.exports={get_diffumColor,
                get_cant_pix_xday,
                get_untouchedPixArr,
                generateRand_MONGO_S3_ids};