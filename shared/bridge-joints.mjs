/** Leave a neat gap before each circular light, measured at the side chord. */
export function bridgeLightSpan(distance,islandRadius,offset=2.65){
 const clearance=1.25;
 const start=Math.sqrt(7.9**2-offset**2)+clearance,end=distance-Math.sqrt((islandRadius-.28)**2-offset**2)-clearance;
 return {start,end,length:Math.max(0,end-start),mid:(start+end)/2};
}
