const {parse}=require("@babel/parser");const fs=require("fs");
let ok=true;
for(const f of ["components.jsx","App.jsx"]){
  let b=fs.readFileSync("src/"+f);let end=b.length;while(end>0&&b[end-1]===0)end--;
  try{parse(b.slice(0,end).toString("utf8"),{sourceType:"module",plugins:["jsx"]});console.log("OK:",f);}
  catch(e){ok=false;console.log("ERR:",f,"=>",e.message);}
}
