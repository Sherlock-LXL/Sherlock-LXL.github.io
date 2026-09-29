/** Leave a neat gap before each circular light, measured at the side chord. */
export function bridgeLightSpan(distance,islandRadius,offset=2.65){
 const start=Math.sqrt(7.9**2-offset**2)+.18,end=distance-Math.sqrt((islandRadius-.28)**2-offset**2)-.18;
 return {start,end,length:end-start,mid:(start+end)/2};
}
