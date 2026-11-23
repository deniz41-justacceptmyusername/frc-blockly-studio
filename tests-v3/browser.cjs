'use strict';
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs');
const runBrowserTests=require('./browser-tests.cjs');
const generateFixtures=require('./fixture-projects.cjs');
const app=path.resolve(__dirname,'..');
const output=path.resolve(process.env.FRC_TEST_OUTPUT||path.join(__dirname,'test-output'));
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BINARY?{executablePath:process.env.CHROME_BINARY}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1680,height:1000},offline:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(path.join(app,'index.html')).href);
  await page.waitForFunction(()=>window.FRC?.StudioPreview&&typeof workspace!=='undefined'&&workspace);
  if(!process.argv.includes('--fixtures-only')){
   const results=await runBrowserTests(page,output,errors);
   if(results.some(result=>!result.passed))process.exitCode=1;
  }
  if(!process.argv.includes('--ui-only'))await generateFixtures(page,output);
  console.log('Test output: '+output);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
