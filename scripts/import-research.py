"""Read manuscript equations as structured MathML; do not edit original DOCX files."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
from html import escape
import json, argparse
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Re-extract equations from the manuscripts archived inside XiangMeta.')
parser.add_argument('--output',type=Path,default=root/'src/core/research-content.json')
output=parser.parse_args().output
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math'}
def math(node):
 if node is None:return '<mrow/>'
 tag=E.QName(node).localname
 child=lambda name: math(node.find('m:'+name,ns))
 inner=lambda: ''.join(math(n) for n in node if E.QName(n).namespace==ns['m'] and not E.QName(n).localname.endswith('Pr'))
 if tag.endswith('Pr'):return ''
 if tag=='r':return '<mtext>'+escape(''.join(node.xpath('.//m:t/text()',namespaces=ns)))+'</mtext>'
 if tag=='f':return '<mfrac>'+child('num')+child('den')+'</mfrac>'
 if tag in ['sSub','sSup','sSubSup']:
  out={'sSub':('msub',['e','sub']),'sSup':('msup',['e','sup']),'sSubSup':('msubsup',['e','sub','sup'])}[tag]
  base=child('e')
  if tag=='sSup' and node.find('m:e/m:f',ns) is not None:base='<mrow><mo>(</mo>'+base+'<mo>)</mo></mrow>'
  return '<'+out[0]+'>'+base+''.join(child(n) for n in out[1][1:])+'</'+out[0]+'>'
 if tag=='d':
  a=node.find('m:dPr/m:begChr',ns);b=node.find('m:dPr/m:endChr',ns)
  return '<mrow><mo>'+escape(a.get('{'+ns['m']+'}val') if a is not None else '(')+'</mo>'+inner()+'<mo>'+escape(b.get('{'+ns['m']+'}val') if b is not None else ')')+'</mo></mrow>'
 if tag=='nary':
  op=node.find('m:naryPr/m:chr',ns);symbol=op.get('{'+ns['m']+'}val') if op is not None else '∫'
  return '<mrow><msubsup><mo>'+symbol+'</mo>'+child('sub')+child('sup')+'</msubsup>'+child('e')+'</mrow>'
 return '<mrow>'+inner()+'</mrow>'
sources={
 'bubble':('wall-attached-bubble-growth.docx','Wall-Attached Bubble Growth in Electrolyte Solutions',[(74,'球冠体积系数 · 式 (5)'),(105,'Henry 定律与 Laplace 压力 · 式 (17)'),(110,'Popov 几何因子 · 式 (19)'),(120,'壁面气泡生长方程 · 式 (23)')]),
 'sonoluminescence':('salt-single-bubble-sonoluminescence.docx','Effects of salt concentration on single-bubble sonoluminescence',[(73,'Rayleigh–Plesset 动力学 · 式 (6)'),(83,'准绝热温度关系 · 式 (10)'),(89,'水活度 · 式 (12)'),(91,'溶液蒸气压 · 式 (13)')])}
data={}
for kind,(filename,title,equations) in sources.items():
 doc=E.fromstring(ZipFile(root/'asset-sources/research'/filename).read('word/document.xml'));paragraphs=doc.xpath('//w:body//w:p',namespaces=ns)
 data[kind]={'title':title,'source':filename,'equations':[{'title':label,'math':'<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">'+math(paragraphs[i].find('.//m:oMath',ns))+'</math>'} for i,label in equations]}
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
