import json
seed=open(__import__('sys').argv[1] if len(__import__('sys').argv)>1 else 'project_seed.json').read().replace('<','\\u003c')
h=open('src/head.html').read().replace('/*SEED*/',seed).replace('/*VER*/',__import__('datetime').datetime.now(__import__('datetime').timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))
js=''.join(open('src/'+f).read() for f in ['core.js','views1.js','views2.js','views3.js','views5.js','views6.js','views4.js'])
open(__import__('sys').argv[2] if len(__import__('sys').argv)>2 else 'index.html','w').write(h+js)
