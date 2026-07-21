(function attachPtoModelArchitectureTrainingSidecar(global){
  'use strict';

  const NS='http://www.w3.org/2000/svg';
  const STAGE_RANGES=[[0,11],[12,22],[23,34],[35,45]];
  const SAMPLE_LAYERS=new Set([0,11,22,34,45]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const qs=(value,root=document)=>typeof value==='string'?root.querySelector(value):value;
  const seeded=(layer,salt=0)=>{
    const raw=Math.sin((layer+1)*12.9898+(salt+1)*78.233)*43758.5453;
    return raw-Math.floor(raw);
  };

  function mockSnapshot(layer,context={}){
    const stage=STAGE_RANGES.findIndex(([lo,hi])=>layer>=lo&&layer<=hi);
    const dense=layer<2;
    const mean=(seeded(layer,1)-.5)*.018;
    const std=.91+seeded(layer,2)*.16;
    const amax=6.8+seeded(layer,3)*2.9;
    const gradNorm=.42+seeded(layer,4)*.72;
    const weightNorm=21+seeded(layer,5)*11;
    const updateRatio=1.2e-4+seeded(layer,6)*2.2e-4;
    const latency=(dense?1.18:1.86)+seeded(layer,7)*(dense?.28:.54);
    return{
      provenance:'mock',step:context.step??18420,microbatch:context.microbatch??3,microbatchCount:context.microbatchCount??8,
      rank:context.rank??stage*8,stage,layer,tensor:'layer_output_hidden_state',
      module:{kind:dense?'Attention + Dense FFN':'Attention + MoE',dense},
      tensor:{hidden:{mean,std,min:-amax*(.86+seeded(layer,8)*.12),max:amax,amax,norm:std*(87+seeded(layer,9)*16)},activationGradient:{norm:gradNorm,amax:gradNorm*(4.4+seeded(layer,10)*2.2)}},
      parameter:{weightNorm,gradientNorm:gradNorm*(.78+seeded(layer,11)*.45),updateRatio,version:context.step??18420},
      optimizer:{accumulated:context.microbatchCount??8,total:context.microbatchCount??8,lossScale:65536,clipThreshold:1,overflow:false,state:'m / v sharded'},
      metric:{std,norm:std,amax,latency,loss:layer===45?2.84:null}
    };
  }

  function tip(node,text,detail=null){
    if(!node||!text)return node;
    const fallback={title:String(text).split('·')[0].trim(),category:'Annotation',definition:String(text),status:'info',statusLabel:'语义说明'};
    const payload=detail||fallback;node.dataset.tip=String(text);node.dataset.detail=JSON.stringify(payload);node.dataset.detailKey=String(payload.key||text);node.setAttribute('aria-label',`${String(text)} · 点击查看详情`);return node;
  }

  function label(container,className,text,x,y,tooltip=text,detail=null){
    const node=document.createElement('div');
    node.className=className;node.textContent=text;node.style.left=`${x}px`;node.style.top=`${y}px`;container.appendChild(node);return tip(node,tooltip,detail);
  }

  function path(points,className,attrs={}){
    const node=document.createElementNS(NS,'path');node.setAttribute('class',className);node.setAttribute('d',points);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));return node;
  }

  function circle(x,y,r,className){
    const node=document.createElementNS(NS,'circle');node.setAttribute('class',className);node.setAttribute('cx',x.toFixed(1));node.setAttribute('cy',y.toFixed(1));node.setAttribute('r',String(r));return node;
  }

  function mount(rootInput,options={}){
    const root=qs(rootInput);if(!root||!global.PtoModelArchitecture3dDeck)return null;
    let controller=null,raf=0,dragPreviewRaf=0,destroyed=false,selectedLayer=null,selectedDetail=null,selectedDetailKey=null,fitZoom=1,dragging=false,dragOrigin=null;
    const context={step:options.step??18420,microbatch:options.microbatch??3,microbatchCount:options.microbatchCount??8};
    const snapshots=new Map(Object.entries(options.snapshots||{}).map(([layer,data])=>[Number(layer),data]));
    const snapshotFor=(layer)=>snapshots.get(Number(layer))||mockSnapshot(Number(layer),context);
    const metricValue=(snapshot,key)=>key==='std'?(snapshot.metric?.std??snapshot.metric?.norm??snapshot.tensor?.hidden?.std):snapshot.metric?.[key];
    const baseOptions={...options,showSideLabels:false,initialView:options.initialView||'right',onViewChange(view,api){options.onViewChange?.(view,api);queueSidecarFit();},onThemeChange(theme,api){options.onThemeChange?.(theme,api);schedule();},onParallelModeChange(mode,api){options.onParallelModeChange?.(mode,api);schedule();}};
    controller=global.PtoModelArchitecture3dDeck.render(root,baseOptions);if(!controller)return null;
    root.classList.add('pto-model-training-sidecar');root.dataset.trainingSidecar='true';
    const viewport=root.querySelector('.pto-model-deck__viewport');
    const svg=document.createElementNS(NS,'svg');svg.classList.add('pto-training-sidecar__svg');svg.setAttribute('aria-label','Training semantics overlay');
    const labels=document.createElement('div');labels.className='pto-training-sidecar__labels';
    const contextBadge=document.createElement('div');contextBadge.className='pto-training-sidecar__context';contextBadge.innerHTML=`<b>MOCK</b> step ${context.step} · MB ${context.microbatch}/${context.microbatchCount}`;
    tip(contextBadge,`Mock telemetry context · optimization step ${context.step} · microbatch ${context.microbatch} of ${context.microbatchCount}`,{title:'Mock telemetry context',category:'Context',definition:'本页面数值为可复现的示意数据，用于验证信息架构，不代表真实训练测量。',values:[['Optimization step',context.step],['Microbatch',`${context.microbatch}/${context.microbatchCount}`]],status:'info',statusLabel:'MOCK 数据'});
    const focus=document.createElement('aside');focus.className='pto-training-sidecar__focus';focus.setAttribute('aria-live','polite');
    const tooltip=document.createElement('div');tooltip.className='pto-training-sidecar__tooltip';tooltip.setAttribute('role','tooltip');
    const detailPanel=document.createElement('aside');detailPanel.className='pto-training-sidecar__inspector';detailPanel.setAttribute('aria-live','polite');
    viewport.append(svg,labels,contextBadge,focus,tooltip,detailPanel);

    function geometry(){
      const width=viewport.clientWidth,height=viewport.clientHeight,base=viewport.getBoundingClientRect();
      const cards=Array.from(root.querySelectorAll('.pto-model-deck__layer[data-layer]'));
      if(!width||!height||!cards.length)return null;
      const points=cards.map(card=>{const rect=card.getBoundingClientRect();return{layer:Number(card.dataset.layer),stage:Number(card.dataset.stage),x:rect.left+rect.width/2-base.left,top:rect.top-base.top,bottom:rect.bottom-base.top,card};}).sort((a,b)=>a.layer-b.layer);
      const rects=cards.map(card=>card.getBoundingClientRect()),modelTop=Math.min(...rects.map(rect=>rect.top))-base.top,modelBottom=Math.max(...rects.map(rect=>rect.bottom))-base.top;
      const centerOf=(selector)=>{const node=root.querySelector(selector),rect=node?.getBoundingClientRect();return rect?{x:rect.left+rect.width/2-base.left,y:rect.top+rect.height/2-base.top}:null;};
      const input=centerOf('.pto-model-deck__static--input [data-node="embedding"]')||{x:points[0].x-42,y:modelTop};
      const output=centerOf('.pto-model-deck__static--output [data-node="final_norm"]')||{x:points[points.length-1].x+42,y:modelTop};
      const gap=points.length>1?Math.max(4,Math.abs(points[1].x-points[0].x)):12,scale=clamp(controller.state.zoom/Math.max(.001,fitZoom),.45,2.4);
      const axisY=modelTop-250*scale;
      const stageY=axisY-32*scale;
      const metricY=axisY+38*scale;
      const inputSummaryY=modelTop-100*scale;
      const hiddenY=modelTop-60*scale;
      const embeddingY=modelTop-22*scale;
      const backwardY=modelBottom+28*scale;
      const parameterY=backwardY+34*scale;
      const optimizerY=parameterY+38*scale;
      return{width,height,base,points,modelTop,modelBottom,input,output,gap,scale,axisY,stageY,metricY,inputSummaryY,hiddenY,embeddingY,backwardY,parameterY,optimizerY};
    }

    function flowTexture(x0,x1,y,direction,scale,anchors=[]){
      const group=document.createElementNS(NS,'g'),height=16*scale,rx=4*scale;
      group.setAttribute('class',`pto-training-sidecar__flow-texture is-${direction}`);
      const base=document.createElementNS(NS,'rect');base.setAttribute('class','pto-training-sidecar__flow-texture-base');base.setAttribute('x',x0.toFixed(1));base.setAttribute('y',(y-height/2).toFixed(1));base.setAttribute('width',Math.max(1,x1-x0).toFixed(1));base.setAttribute('height',height.toFixed(1));base.setAttribute('rx',rx.toFixed(1));
      group.append(base);
      const points=[...new Set(anchors.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b),halfHeight=5*scale;
      for(let index=0;index<points.length-1;index+=1){
        const left=points[index],right=points[index+1],gap=right-left,x=(left+right)/2,halfWidth=Math.min(4*scale,gap*.26);
        const d=direction==='forward'?`M${(x-halfWidth).toFixed(1)} ${(y-halfHeight).toFixed(1)}L${(x+halfWidth).toFixed(1)} ${y.toFixed(1)}L${(x-halfWidth).toFixed(1)} ${(y+halfHeight).toFixed(1)}`:`M${(x+halfWidth).toFixed(1)} ${(y-halfHeight).toFixed(1)}L${(x-halfWidth).toFixed(1)} ${y.toFixed(1)}L${(x+halfWidth).toFixed(1)} ${(y+halfHeight).toFixed(1)}`;
        group.append(path(d,'pto-training-sidecar__flow-texture-arrow'));
      }
      return group;
    }

    function metricDetail(key,name,value,min,max,layer){
      const definitions={
        std:'Layer 输出 hidden state 的标准差 σ，用于观察激活分布的离散程度与层间突变；它不是 L2/RMS Norm。',
        amax:'张量绝对值的最大值 max(|x|)，常用于观察动态范围、量化溢出风险和异常尖峰。',
        latency:'该 Layer 一次前向执行的示意耗时，用于定位计算或通信热点；实际值必须绑定 step、microbatch、rank 和设备事件。'
      };
      const units=key==='latency'?' ms':'',span=max-min,near=value<min+span*.1||value>max-span*.1;
      const status=value<min||value>max?'abnormal':near?'warning':'normal';
      const statusLabel=status==='abnormal'?'异常：超出参考范围':status==='warning'?'关注：接近参考边界':'正常：位于参考范围';
      const snapshot=snapshotFor(layer);
      return{title:`${name} · L${layer}`,category:'Metric',definition:definitions[key],values:[['当前值',`${Number(value).toFixed(key==='latency'?2:3)}${units}`],['参考范围',`${min}–${max}${units}`],['数据来源','MOCK']],status,statusLabel,context:`step ${snapshot.step} · MB ${snapshot.microbatch}/${snapshot.microbatchCount} · PP${snapshot.stage} · rank ${snapshot.rank} · layer ${layer} · tensor ${snapshot.tensor}`};
    }

    function communicationDetail(lo,direction,key){
      const forward=direction==='forward',sourceLayer=forward?lo-1:lo,snapshot=snapshotFor(sourceLayer),sourceStage=forward?snapshot.stage:snapshot.stage,destinationStage=forward?sourceStage+1:sourceStage-1,latency=.18+seeded(lo,forward?17:18)*.14;
      if(forward){
        const hidden=snapshot.tensor.hidden,status=hidden.amax>9.7?'abnormal':hidden.amax>9.35?'warning':'normal';
        return{key,title:`PP forward boundary · L${lo-1} → L${lo}`,category:'PP Communication',definition:'相邻 Pipeline Stage 之间发送/接收前向 activation hidden state。普通 Layer 边界是本地张量依赖，只有该 PP 边界发生 P2P 通信。',values:[['Boundary',`L${lo-1} → L${lo}`],['Source',`PP${sourceStage} · ranks ${sourceStage*8}–${sourceStage*8+7}`],['Destination',`PP${destinationStage} · ranks ${destinationStage*8}–${destinationStage*8+7}`],['Tensor',`h${lo}`],['Mean',hidden.mean.toFixed(4)],['Std σ',hidden.std.toFixed(3)],['Amax',hidden.amax.toFixed(2)],['L2 proxy',hidden.norm.toFixed(1)],['P2P latency',`${latency.toFixed(2)} ms · MOCK`]],status,statusLabel:status==='abnormal'?'异常：边界 activation Amax 超出参考范围':status==='warning'?'关注：边界 activation Amax 接近参考边界':'正常：边界 activation mock 统计位于参考范围',context:`step ${snapshot.step} · MB ${snapshot.microbatch}/${snapshot.microbatchCount} · PP${sourceStage} → PP${destinationStage} · Send/Recv forward activation · MOCK`};
      }
      const gradient=snapshot.tensor.activationGradient,status=gradient.norm>1.2?'warning':'normal';
      return{key,title:`PP backward boundary · L${lo} → L${lo-1}`,category:'PP Communication',definition:'相邻 Pipeline Stage 之间发送/接收反向 activation gradient ∂L/∂h；跨边界传输的不是参数梯度 ∂L/∂W。',values:[['Boundary',`L${lo} → L${lo-1}`],['Source',`PP${sourceStage} · ranks ${sourceStage*8}–${sourceStage*8+7}`],['Destination',`PP${destinationStage} · ranks ${destinationStage*8}–${destinationStage*8+7}`],['Tensor','g = ∂L/∂h'],['Gradient norm',gradient.norm.toFixed(3)],['Gradient amax',gradient.amax.toFixed(3)],['P2P latency',`${latency.toFixed(2)} ms · MOCK`]],status,statusLabel:status==='warning'?'关注：边界激活梯度偏高':'正常：边界激活梯度位于 mock 参考范围',context:`step ${snapshot.step} · MB ${snapshot.microbatch}/${snapshot.microbatchCount} · PP${sourceStage} → PP${destinationStage} · Send/Recv backward activation gradient · MOCK`};
    }

    function positionDetailPanel(){
      if(!selectedDetail||!selectedDetailKey||!detailPanel.classList.contains('is-open'))return;
      const target=root.querySelector(`[data-detail-key="${CSS.escape(selectedDetailKey)}"]`);if(!target)return;
      const base=viewport.getBoundingClientRect(),rect=target.getBoundingClientRect(),panelWidth=detailPanel.offsetWidth||330,panelHeight=detailPanel.offsetHeight||280;
      const rightSpace=base.right-rect.right,leftSpace=rect.left-base.left;
      const left=rightSpace>=panelWidth+24?rect.right-base.left+12:leftSpace>=panelWidth+24?rect.left-base.left-panelWidth-12:clamp(rect.left+rect.width/2-base.left-panelWidth/2,12,base.width-panelWidth-12);
      const top=clamp(rect.top+rect.height/2-base.top-panelHeight/2,72,base.height-panelHeight-16);
      detailPanel.style.left=`${left}px`;detailPanel.style.right='auto';detailPanel.style.top=`${top}px`;
    }

    function openDetail(detail,target=null){
      selectedDetail=detail;selectedDetailKey=detail?(target?.dataset.detailKey||detail.key||null):null;if(!detail){detailPanel.classList.remove('is-open');detailPanel.replaceChildren();return api;}
      if(!selectedDetailKey){detailPanel.style.left='auto';detailPanel.style.right='16px';detailPanel.style.top='108px';}
      const values=(detail.values||[]).map(([key,value])=>`<div><span>${esc(key)}</span><b>${esc(value)}</b></div>`).join('');
      detailPanel.innerHTML=`<header><div><span>${esc(detail.category||'Annotation')}</span><h3>${esc(detail.title||'Detail')}</h3></div><button type="button" aria-label="关闭详情">×</button></header><p>${esc(detail.definition||'')}</p>${values?`<section class="pto-training-sidecar__inspector-values">${values}</section>`:''}<section class="pto-training-sidecar__assessment is-${esc(detail.status||'info')}"><b>${esc(detail.statusLabel||'语义说明')}</b>${detail.reference?`<span>${esc(detail.reference)}</span>`:''}</section>${detail.context?`<footer>${esc(detail.context)}</footer>`:''}`;
      detailPanel.classList.add('is-open');tooltip.classList.remove('is-visible');requestAnimationFrame(positionDetailPanel);return api;
    }

    detailPanel.addEventListener('click',event=>{if(event.target.closest('button'))openDetail(null);});

    function operatorRows(g){
      const rows=(controller.config.sideRows||[]).map(row=>{
        const nodes=g.points.flatMap(point=>row.ids.map(id=>point.card.querySelector(`[data-node="${CSS.escape(id)}"]`)).filter(Boolean));
        const rects=nodes.map(node=>node.getBoundingClientRect()).filter(rect=>rect.height>0);if(!rects.length)return null;
        const left=Math.min(...rects.map(rect=>rect.left))-g.base.left-4,right=Math.max(...rects.map(rect=>rect.right))-g.base.left+4;
        const top=Math.min(...rects.map(rect=>rect.top))-g.base.top-3,bottom=Math.max(...rects.map(rect=>rect.bottom))-g.base.top+3;
        const pseudo=getComputedStyle(nodes[0],'::after'),computed=getComputedStyle(nodes[0]),color=pseudo.backgroundColor&&pseudo.backgroundColor!=='rgba(0, 0, 0, 0)'?pseudo.backgroundColor:computed.getPropertyValue('--node-color').trim()||'var(--foreground-muted)';
        return{label:row.label,ids:row.ids,nodes,left,right,top,bottom,y:(top+bottom)/2,color};
      }).filter(Boolean).sort((a,b)=>a.y-b.y||a.left-b.left);
      const merged=[];
      rows.forEach(item=>{
        const match=merged.find(candidate=>{
          const overlap=Math.max(0,Math.min(candidate.right,item.right)-Math.max(candidate.left,item.left));
          return Math.abs(candidate.y-item.y)<7&&overlap>Math.min(candidate.right-candidate.left,item.right-item.left)*.55;
        });
        if(!match){merged.push({...item});return;}
        match.label=`${match.label} / ${item.label}`;match.ids=[...new Set([...match.ids,...item.ids])];match.nodes.push(...item.nodes);match.left=Math.min(match.left,item.left);match.right=Math.max(match.right,item.right);match.top=Math.min(match.top,item.top);match.bottom=Math.max(match.bottom,item.bottom);match.y=(match.top+match.bottom)/2;
      });
      return merged;
    }

    function renderOperatorBands(g){
      const summaryLabels=Array.from(root.querySelectorAll('.pto-model-deck__side-ffn-label')).map(node=>{const rect=node.getBoundingClientRect();return{left:rect.left-g.base.left,right:rect.right-g.base.left,y:rect.top+rect.height/2-g.base.top};});
      operatorRows(g).forEach(item=>{
        const detail={title:item.label,category:'Operator row',definition:'该框对应侧视投影中同一计算高度上的算子集合；横向范围表示这些算子在哪些 Decoder Layers 中存在。',values:[['Operator IDs',item.ids.join(', ')],['投影范围',`${Math.round(item.left)}–${Math.round(item.right)} px`],['数据来源','模型结构']],status:'info',statusLabel:'结构标注：不进行数值异常判定'};
        const band=document.createElementNS(NS,'rect');band.setAttribute('class','pto-training-sidecar__operator-band');band.setAttribute('x',item.left.toFixed(1));band.setAttribute('y',item.top.toFixed(1));band.setAttribute('width',Math.max(8,item.right-item.left).toFixed(1));band.setAttribute('height',Math.max(8,item.bottom-item.top).toFixed(1));band.setAttribute('rx','4');band.style.setProperty('--operator-color',item.color);tip(band,`${item.label} · operator row`,detail);svg.appendChild(band);
        const centerX=(item.left+item.right)/2,text=label(labels,'pto-training-sidecar__operator-label',item.label,centerX,item.y,`${item.label} · operator row`,detail);text.style.setProperty('--operator-color',item.color);
        const textRect=text.getBoundingClientRect(),half=textRect.width/2,candidates=[centerX,item.left+half+7,item.right-half-7].filter(x=>x-half>=item.left&&x+half<=item.right);
        const clear=candidates.find(x=>summaryLabels.every(summary=>Math.abs(summary.y-item.y)>=12||x+half<=summary.left-5||x-half>=summary.right+5));
        if(Number.isFinite(clear))text.style.left=`${clear}px`;
      });
    }

    function renderStaticOperatorBands(g){
      const specs=[
        ['input',['token_ids','positions','attention_context','embedding_weight'],'Token IDs / Position IDs / Attention Context / Embedding Weight'],
        ['input',['embedding'],'Parallel Embedding'],
        ['output',['final_norm'],'Final RMSNorm'],['output',['lm_head_weight','lm_head'],'LM Head Weight / LM Head'],
        ['output',['logits_allgather'],'Logits All-Gather'],['output',['logits'],'Logits'],
        ['output',['mtp_input_norms'],'MTP Input Norms'],['output',['mtp_eh_proj'],'EH Projection'],
        ['output',['mtp_decoder_layer'],'MTP Decoder ×3'],['output',['mtp_head_weight','mtp_shared_head'],'MTP Head Weight / MTP Shared Head'],
        ['output',['mtp_logits'],'MTP Logits']
      ];
      specs.forEach(([kind,ids,text])=>{
        const scope=root.querySelector(`.pto-model-deck__static--${kind}`);if(!scope)return;
        const rects=ids.map(id=>scope.querySelector(`[data-node="${CSS.escape(id)}"]`)).filter(Boolean).map(node=>node.getBoundingClientRect()).filter(rect=>rect.height>0);if(!rects.length)return;
        const left=Math.min(...rects.map(rect=>rect.left))-g.base.left-4,right=Math.max(...rects.map(rect=>rect.right))-g.base.left+4;
        let top=Math.min(...rects.map(rect=>rect.top))-g.base.top-3,bottom=Math.max(...rects.map(rect=>rect.bottom))-g.base.top+3,y=(top+bottom)/2;
        if(kind==='input'){
          const laneY=ids.includes('embedding')?g.embeddingY:g.inputSummaryY,laneHeight=Math.max(16*g.scale,bottom-top);
          y=laneY;top=y-laneHeight/2;bottom=y+laneHeight/2;
        }
        const detail={title:text,category:kind==='input'?'Model input':'Model output',definition:kind==='input'?'模型入口算子：将离散输入和位置/上下文信息转换为进入 Decoder stack 的初始 hidden state。':'模型末端算子：将最终 hidden state 归一化并投影到词表 logits，或生成 MTP 辅助输出。',values:[['Node IDs',ids.join(', ')],['数据来源','模型结构']],status:'info',statusLabel:'结构标注：不进行数值异常判定'};
        const band=document.createElementNS(NS,'rect');band.setAttribute('class',`pto-training-sidecar__operator-band is-${kind}`);band.setAttribute('x',left.toFixed(1));band.setAttribute('y',top.toFixed(1));band.setAttribute('width',Math.max(8,right-left).toFixed(1));band.setAttribute('height',Math.max(8,bottom-top).toFixed(1));band.setAttribute('rx','4');band.style.setProperty('--operator-color',kind==='input'?'var(--pto-model-deck-embedding)':'var(--pto-model-deck-head)');tip(band,`${text} · ${kind==='input'?'model input':'model output'}`,detail);svg.appendChild(band);
        const node=label(labels,`pto-training-sidecar__operator-label is-${kind}`,text,(left+right)/2,y,`${text} · ${kind==='input'?'model input':'model output'}`,detail);node.style.setProperty('--operator-color',kind==='input'?'var(--pto-model-deck-embedding)':'var(--pto-model-deck-head)');
      });
    }

    function renderBaseAnnotationTips(g){
      const specs=[
        ['.pto-model-deck__annotation.is-side',node=>`${node.textContent.trim()} · pipeline-parallel layer partition`],
        ['.pto-model-deck__side-ffn-label',node=>`${node.textContent.trim()} · decoder FFN range`],
        ['.pto-model-deck__side-residual-label',()=>`mHC residual state ×4 · four parallel residual rails connected from model input to output`]
      ];
      specs.forEach(([selector,describe])=>root.querySelectorAll(selector).forEach(source=>{
        const rect=source.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
        const hit=document.createElement('div');hit.className='pto-training-sidecar__base-tip-hit';hit.style.left=`${rect.left-g.base.left}px`;hit.style.top=`${rect.top-g.base.top}px`;hit.style.width=`${rect.width}px`;hit.style.height=`${rect.height}px`;tip(hit,describe(source));labels.appendChild(hit);
      }));
    }

    function renderFocus(g){
      if(!Number.isFinite(selectedLayer)){focus.classList.remove('is-open');focus.replaceChildren();return;}
      const point=g.points.find(item=>item.layer===selectedLayer);if(!point)return;
      const snapshot=snapshotFor(selectedLayer),panelWidth=292,panelHeight=438;
      const left=clamp(point.x-panelWidth/2,74,g.width-panelWidth-16),top=clamp((g.modelTop+g.modelBottom)/2-panelHeight/2,74,g.height-panelHeight-18);
      focus.style.left=`${left}px`;focus.style.top=`${top}px`;focus.classList.add('is-open');
      focus.innerHTML=`
        <div class="pto-training-sidecar__focus-header"><div class="pto-training-sidecar__focus-title">Layer L${snapshot.layer}<span>PP${snapshot.stage} · rank ${snapshot.rank} · MOCK</span></div><button class="pto-training-sidecar__focus-close" type="button" aria-label="收起 Layer">×</button></div>
        <section class="pto-training-sidecar__focus-section"><b>Tensor · Forward</b><div class="pto-training-sidecar__flow is-forward"><span>h${snapshot.layer}</span><i></i><span>h${snapshot.layer+1}</span></div><div class="pto-training-sidecar__kv"><span>μ ${snapshot.tensor.hidden.mean.toFixed(4)}</span><span>σ ${snapshot.tensor.hidden.std.toFixed(3)}</span><span>amax ${snapshot.tensor.hidden.amax.toFixed(2)}</span><span>norm ${snapshot.tensor.hidden.norm.toFixed(1)}</span></div></section>
        <section class="pto-training-sidecar__focus-section"><b>Module</b><div class="pto-training-sidecar__detail-slot" data-layer-detail-slot>Layer internal renderer slot<br>${esc(snapshot.module.kind)}</div></section>
        <section class="pto-training-sidecar__focus-section"><b>Tensor · Backward</b><div class="pto-training-sidecar__flow is-backward"><span>g${snapshot.layer}</span><i></i><span>g${snapshot.layer+1}</span></div><div class="pto-training-sidecar__kv"><span>grad h · L2 ${snapshot.tensor.activationGradient.norm.toFixed(3)}</span><span>amax ${snapshot.tensor.activationGradient.amax.toFixed(2)}</span></div></section>
        <section class="pto-training-sidecar__focus-section"><b>Parameter / Metric</b><div class="pto-training-sidecar__kv"><span>W · L2 ${snapshot.parameter.weightNorm.toFixed(1)}</span><span>grad W · L2 ${snapshot.parameter.gradientNorm.toFixed(3)}</span><span>update/W ${snapshot.parameter.updateRatio.toExponential(2)}</span><span>${snapshot.metric.latency.toFixed(2)} ms</span></div></section>`;
      focus.querySelector('.pto-training-sidecar__focus-close')?.addEventListener('click',()=>selectLayer(null));
      const slot=focus.querySelector('[data-layer-detail-slot]');
      if(typeof options.renderLayerDetail==='function'){
        const content=options.renderLayerDetail({layer:selectedLayer,snapshot,slot,controller:api});
        if(global.Node&&content instanceof global.Node)slot.replaceChildren(content);else if(typeof content==='string')slot.innerHTML=content;
      }
    }

    function render(){
      raf=0;if(destroyed)return;clearDragPreview();const g=geometry();if(!g)return;
      root.style.setProperty('--pto-training-sidecar-scale',g.scale.toFixed(4));
      svg.setAttribute('viewBox',`0 0 ${g.width} ${g.height}`);svg.replaceChildren();labels.replaceChildren();
      const first=g.points[0],last=g.points[g.points.length-1],x0=Math.min(g.input.x,first.x),x1=Math.max(g.output.x,last.x);
      STAGE_RANGES.slice(1).forEach(([lo])=>{const before=g.points.find(point=>point.layer===lo-1),after=g.points.find(point=>point.layer===lo);if(!before||!after)return;const x=(before.x+after.x)/2,guide=path(`M${x.toFixed(1)} ${(g.stageY-18*g.scale).toFixed(1)}L${x.toFixed(1)} ${(g.optimizerY+10*g.scale).toFixed(1)}`,'pto-training-sidecar__stage-guide');tip(guide,`PP boundary · L${lo-1}/L${lo} · spans all training lanes`);svg.append(guide);});
      g.points.forEach(point=>svg.append(path(`M${point.x.toFixed(1)} ${(g.axisY+5*g.scale).toFixed(1)}L${point.x.toFixed(1)} ${g.optimizerY.toFixed(1)}`,'pto-training-sidecar__layer-guide')));
      label(labels,'pto-training-sidecar__value-label','MODEL DEPTH / TOPOLOGY',first.x-78*g.scale,g.axisY-5*g.scale,'Model depth / topology axis · layer order, not runtime time');

      const metricRows=[
        {key:'std',name:'Std σ',color:'var(--training-metric-std)',min:.82,max:1.08,unit:'',precision:3},
        {key:'amax',name:'Amax',color:'var(--training-metric-amax)',min:6.8,max:9.7,unit:'',precision:2},
        {key:'latency',name:'Latency',color:'var(--training-metric-latency)',min:1.1,max:2.5,unit:' ms',precision:2}
      ];
      metricRows.forEach((metric,row)=>{
        const {key,name,color,min,max,unit,precision}=metric,chartHeight=18*g.scale,rowStep=24*g.scale,top=g.metricY+row*rowStep,span=max-min,domainMin=min-span*.18,domainMax=max+span*.18;
        const yFor=(value)=>top+chartHeight*(1-clamp((value-domainMin)/(domainMax-domainMin),0,1));
        const band=document.createElementNS(NS,'rect'),bandTop=yFor(max),bandBottom=yFor(min);
        band.setAttribute('class','pto-training-sidecar__metric-band');band.setAttribute('x',first.x.toFixed(1));band.setAttribute('y',bandTop.toFixed(1));band.setAttribute('width',Math.max(1,last.x-first.x).toFixed(1));band.setAttribute('height',Math.max(1,bandBottom-bandTop).toFixed(1));band.style.setProperty('--metric-color',color);svg.appendChild(band);
        const midline=path(`M${first.x.toFixed(1)} ${yFor((min+max)/2).toFixed(1)}L${last.x.toFixed(1)} ${yFor((min+max)/2).toFixed(1)}`,'pto-training-sidecar__metric-midline');midline.style.setProperty('--metric-color',color);svg.appendChild(midline);
        const series=g.points.map(point=>({point,value:Number(metricValue(snapshotFor(point.layer),key))}));
        const line=path(series.map(({point,value},index)=>`${index?'L':'M'}${point.x.toFixed(1)} ${yFor(value).toFixed(1)}`).join(' '),'pto-training-sidecar__metric-line');line.style.setProperty('--metric-color',color);tip(line,`${name} · L0–L45 trend · MOCK`,{title:`${name} · Layer trend`,category:'Metric line',definition:metricDetail(key,name,(min+max)/2,min,max,0).definition,values:[['参考范围',`${min}–${max}${unit}`],['横轴','Decoder Layer L0–L45'],['数据来源','MOCK']],status:'info',statusLabel:'折线显示逐 Layer 趋势；淡色带为参考范围'});svg.appendChild(line);
        series.forEach(({point,value})=>{const dot=circle(point.x,yFor(value),2.1*g.scale,'pto-training-sidecar__metric-point');dot.style.setProperty('--metric-color',color);tip(dot,`L${point.layer} · ${name} ${value.toFixed(precision)}${unit} · MOCK`,metricDetail(key,name,value,min,max,point.layer));svg.appendChild(dot);});
        label(labels,'pto-training-sidecar__metric-label',`${name} · ${min}–${max}${unit}`,x0-20*g.scale,top+chartHeight/2,`${name} line chart · reference ${min}–${max}${unit}`,{title:name,category:'Metric line',definition:metricDetail(key,name,(min+max)/2,min,max,0).definition,values:[['参考范围',`${min}–${max}${unit}`],['横轴','L0–L45']],status:'info',statusLabel:'点击折线节点查看对应 Layer 数值'});
      });

      renderOperatorBands(g);
      renderStaticOperatorBands(g);
      renderBaseAnnotationTips(g);

      const hiddenPoints=[{x:g.input.x},...g.points,{x:g.output.x}].sort((a,b)=>a.x-b.x);
      const layerAnchors=g.points.map(point=>point.x);
      svg.append(flowTexture(hiddenPoints[0].x,hiddenPoints[hiddenPoints.length-1].x,g.hiddenY,'forward',g.scale,layerAnchors));
      const hiddenPath=path(`M${hiddenPoints[0].x.toFixed(1)} ${g.hiddenY.toFixed(1)}L${hiddenPoints[hiddenPoints.length-1].x.toFixed(1)} ${g.hiddenY.toFixed(1)}`,'pto-training-sidecar__hidden');tip(hiddenPath,'Forward hidden state · h₀ → h₄₆',{title:'Forward hidden state',category:'Tensor flow',definition:'hidden state 是 Layer 之间向前传递的主激活张量；只有跨 PP Stage 边界时才发生 activation Send/Recv。',values:[['路径','h₀ → h₁ → … → h₄₆'],['上下文',`step ${context.step} · MB ${context.microbatch}/${context.microbatchCount}`]],status:'info',statusLabel:'数据依赖：非运行时间轴'});svg.append(hiddenPath);
      g.points.forEach(point=>{const snapshot=snapshotFor(point.layer),hidden=snapshot.tensor.hidden,dot=circle(point.x,g.hiddenY,1.75,'pto-training-sidecar__hidden-dot'),status=hidden.amax>9.7?'abnormal':hidden.amax>9.35?'warning':'normal';tip(dot,`L${point.layer} · hidden state · σ ${hidden.std.toFixed(3)} · amax ${hidden.amax.toFixed(2)} · MOCK`,{key:`hidden-state-L${point.layer}`,title:`Hidden state · L${point.layer}`,category:'Tensor',definition:'该点表示对应 Decoder Layer 输出并传递到下一层的 hidden state；跨 PP Stage 边界时通过 activation Send/Recv 传输。',values:[['Mean',hidden.mean.toFixed(4)],['Std σ',hidden.std.toFixed(3)],['Amax',hidden.amax.toFixed(2)],['L2 proxy',hidden.norm.toFixed(1)]],status,statusLabel:status==='abnormal'?'异常：Amax 超出参考范围':status==='warning'?'关注：Amax 接近参考边界':'正常：hidden-state mock 统计位于参考范围',context:`step ${snapshot.step} · MB ${snapshot.microbatch}/${snapshot.microbatchCount} · PP${snapshot.stage} · rank ${snapshot.rank} · L${point.layer} · ${snapshot.tensor} · MOCK`});svg.append(dot);});
      label(labels,'pto-training-sidecar__value-label is-forward','hidden state · h₀ → hₗ → h₄₆',x0+82*g.scale,g.hiddenY-5*g.scale,'Forward hidden-state flow · h₀ from embedding, hₗ between layers, h₄₆ into final head');

      svg.append(flowTexture(x0,x1,g.backwardY,'backward',g.scale,layerAnchors));
      const backwardPath=path(`M${x1.toFixed(1)} ${g.backwardY.toFixed(1)}L${x0.toFixed(1)} ${g.backwardY.toFixed(1)}`,'pto-training-sidecar__backward');tip(backwardPath,'Backward activation gradient · gₗ = ∂L/∂hₗ',{title:'Activation gradient',category:'Tensor flow',definition:'跨 Layer 向后传递的是激活梯度 ∂L/∂h，而不是参数梯度 ∂L/∂W。跨 PP Stage 时发送/接收该激活梯度。',values:[['方向','L45 → L0'],['符号','gₗ = ∂L/∂hₗ']],status:'info',statusLabel:'反向数据依赖'});svg.append(backwardPath);
      g.points.forEach(point=>{const snapshot=snapshotFor(point.layer),activationGradient=snapshot.tensor.activationGradient,backwardDot=circle(point.x,g.backwardY,1.75,'pto-training-sidecar__backward-dot');tip(backwardDot,`L${point.layer} · activation gradient · norm ${activationGradient.norm.toFixed(3)} · MOCK`,{key:`activation-gradient-L${point.layer}`,title:`Activation gradient · L${point.layer}`,category:'Tensor',definition:'该点表示沿 Layer 主干反向传递的激活梯度 ∂L/∂h；它不是参数梯度 ∂L/∂W。',values:[['Gradient norm',activationGradient.norm.toFixed(3)],['Gradient amax',activationGradient.amax.toFixed(3)]],status:activationGradient.norm>1.2?'warning':'normal',statusLabel:activationGradient.norm>1.2?'关注：激活梯度偏高':'正常：位于 mock 参考范围',context:`step ${snapshot.step} · MB ${snapshot.microbatch}/${snapshot.microbatchCount} · PP${snapshot.stage} · rank ${snapshot.rank} · L${point.layer} · MOCK`});svg.append(backwardDot);svg.append(path(`M${point.x.toFixed(1)} ${(g.backwardY+3*g.scale).toFixed(1)}L${point.x.toFixed(1)} ${g.parameterY.toFixed(1)}`,'pto-training-sidecar__parameter-stem'));const parameterDot=circle(point.x,g.parameterY,2.2,'pto-training-sidecar__parameter-dot');tip(parameterDot,`L${point.layer} · parameter gradient ${snapshot.parameter.gradientNorm.toFixed(3)} · MOCK`,{title:`Parameter gradient · L${point.layer}`,category:'Parameter',definition:'该 Layer 根据本层输入激活和上游激活梯度在本地计算 ∂L/∂W；它不会作为跨 Layer 主干继续向前一层传递。',values:[['Gradient norm',snapshot.parameter.gradientNorm.toFixed(3)],['Weight norm',snapshot.parameter.weightNorm.toFixed(1)],['Update / Weight',snapshot.parameter.updateRatio.toExponential(2)]],status:snapshot.parameter.gradientNorm>1.2?'warning':'normal',statusLabel:snapshot.parameter.gradientNorm>1.2?'关注：梯度幅值偏高':'正常：位于 mock 参考范围',context:`step ${snapshot.step} · MB contribution ${snapshot.microbatch}/${snapshot.microbatchCount} · L${point.layer} · MOCK`});svg.append(parameterDot);});
      label(labels,'pto-training-sidecar__value-label is-backward','activation gradient gₗ = ∂L/∂hₗ',x1-138*g.scale,g.backwardY-5*g.scale,'Backward activation gradient · this is ∂L/∂h, not a parameter gradient');

      const optimizerPath=path(`M${x0.toFixed(1)} ${g.optimizerY.toFixed(1)}L${x1.toFixed(1)} ${g.optimizerY.toFixed(1)}`,'pto-training-sidecar__optimizer');tip(optimizerPath,'Optimizer step · accumulated and synchronized parameter gradients',{title:'Optimizer step',category:'Parameter update',definition:'完成 microbatch 梯度累积、DP 同步、unscale/overflow 检查与裁剪后，各 Stage 在同一逻辑 optimization step 中更新自己持有的参数。',values:[['Accumulation',`${context.microbatchCount}/${context.microbatchCount}`],['Loss scale','65536'],['Gradient clip','1.0']],status:'normal',statusLabel:'正常：mock step 已具备更新条件',context:`optimization step ${context.step} · MOCK`});svg.append(optimizerPath);
      label(labels,'pto-training-sidecar__value-label','Accumulation → Reduce-scatter → Unscale → Clip → Optimizer Step → Wₜ₊₁',(x0+x1)/2,g.optimizerY-5*g.scale,'One logical optimizer step after microbatch accumulation and distributed gradient synchronization');

      STAGE_RANGES.slice(1).forEach(([lo])=>{const before=g.points.find(point=>point.layer===lo-1),after=g.points.find(point=>point.layer===lo);if(!before||!after)return;const x=(before.x+after.x)/2,forwardText=`PP boundary L${lo-1}/L${lo} · Send/Recv forward activation h`,backwardText=`PP boundary L${lo-1}/L${lo} · Send/Recv backward activation gradient g`,forwardLine=path(`M${x.toFixed(1)} ${(g.hiddenY-7*g.scale).toFixed(1)}L${x.toFixed(1)} ${(g.hiddenY+7*g.scale).toFixed(1)}`,'pto-training-sidecar__communication is-forward'),backwardLine=path(`M${x.toFixed(1)} ${(g.backwardY-7*g.scale).toFixed(1)}L${x.toFixed(1)} ${(g.backwardY+7*g.scale).toFixed(1)}`,'pto-training-sidecar__communication is-backward');tip(forwardLine,forwardText,communicationDetail(lo,'forward',`pp-forward-boundary-${lo}-line`));tip(backwardLine,backwardText,communicationDetail(lo,'backward',`pp-backward-boundary-${lo}-line`));svg.append(forwardLine,backwardLine);label(labels,'pto-training-sidecar__comm-label is-forward','h S/R',x,g.hiddenY-14*g.scale,forwardText,communicationDetail(lo,'forward',`pp-forward-boundary-${lo}-label`));label(labels,'pto-training-sidecar__comm-label is-backward','g S/R',x,g.backwardY+15*g.scale,backwardText,communicationDetail(lo,'backward',`pp-backward-boundary-${lo}-label`));});

      STAGE_RANGES.forEach(([lo,hi],stage)=>{const a=g.points.find(point=>point.layer===lo),b=g.points.find(point=>point.layer===hi);if(!a||!b)return;label(labels,'pto-training-sidecar__stage-label',`PP Stage ${stage} · L${lo}–L${hi} · ranks ${stage*8}–${stage*8+7}`,(a.x+b.x)/2,g.stageY,`Pipeline stage ${stage} · decoder layers ${lo}–${hi} · device ranks ${stage*8}–${stage*8+7}`);});

      const samples=new Set(SAMPLE_LAYERS);
      g.points.forEach(point=>{
        label(labels,'pto-training-sidecar__layer-number',`L${point.layer}`,point.x,g.axisY-7*g.scale,`Decoder Layer ${point.layer}`);
        const hit=document.createElementNS(NS,'rect');hit.setAttribute('class','pto-training-sidecar__layer-hit');hit.dataset.layer=String(point.layer);hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',`展开 Layer ${point.layer}`);hit.setAttribute('x',(point.x-Math.max(4*g.scale,g.gap*.42)).toFixed(1));hit.setAttribute('y',(g.axisY-13*g.scale).toFixed(1));hit.setAttribute('width',Math.max(8*g.scale,g.gap*.84).toFixed(1));hit.setAttribute('height',(26*g.scale).toFixed(1));svg.appendChild(hit);
        if(samples.has(point.layer)){const snapshot=snapshotFor(point.layer),std=Number(metricValue(snapshot,'std')),status=snapshot.metric.amax>9.35||snapshot.metric.latency>2.35?'warning':'normal';label(labels,'pto-training-sidecar__sample-label',`L${point.layer} · σ${std.toFixed(2)} · ${snapshot.metric.latency.toFixed(2)}ms`,point.x,g.metricY+76*g.scale,`L${point.layer} sample · Std σ ${std.toFixed(3)} · Amax ${snapshot.metric.amax.toFixed(2)} · Latency ${snapshot.metric.latency.toFixed(2)} ms · MOCK`,{title:`Layer metric summary · L${point.layer}`,category:'Metric',definition:'选定 Layer 的 hidden-state 标准差、绝对最大值与执行耗时摘要。点击折线节点可查看各指标定义及独立阈值判断。',values:[['Std σ',std.toFixed(3)],['Amax',snapshot.metric.amax.toFixed(2)],['Latency',`${snapshot.metric.latency.toFixed(2)} ms`]],status,statusLabel:status==='warning'?'关注：至少一项接近参考边界':'正常：摘要指标均位于参考范围',context:`step ${snapshot.step} · MB ${snapshot.microbatch}/${snapshot.microbatchCount} · PP${snapshot.stage} · rank ${snapshot.rank} · MOCK`});}
      });

      if(Number.isFinite(selectedLayer)){
        const point=g.points.find(item=>item.layer===selectedLayer);if(point){const width=Math.max(18*g.scale,g.gap*1.8),selection=document.createElementNS(NS,'rect');selection.setAttribute('class','pto-training-sidecar__selection');selection.setAttribute('x',(point.x-width/2).toFixed(1));selection.setAttribute('y',(g.axisY-17*g.scale).toFixed(1));selection.setAttribute('width',width.toFixed(1));selection.setAttribute('height',Math.max(40*g.scale,g.optimizerY-g.axisY+25*g.scale).toFixed(1));selection.setAttribute('rx',(7*g.scale).toFixed(1));svg.insertBefore(selection,svg.children[1]||null);}
      }

      const semantic=[['指标层','Std σ / Amax / Latency',g.metricY+28*g.scale],['张量层 · 正向','Input / Hidden / Activation / Residual',g.hiddenY],['模块层','Embedding / Attention / MoE / Head',(g.modelTop+g.modelBottom)/2],['张量层 · 反向','Activation Gradient',g.backwardY],['参数层','Weight / Parameter Gradient / Optimizer State',(g.parameterY+g.optimizerY)/2]];
      semantic.forEach(([title,sub,y])=>{const node=label(labels,'pto-training-sidecar__semantic-label','',14,y,`${title} · ${sub}`);node.innerHTML=`${esc(title)}<span>${esc(sub)}</span>`;});
      const loss=snapshotFor(45).metric.loss;label(labels,'pto-training-sidecar__value-label',`Main Loss ${loss.toFixed(2)}`,g.output.x,g.metricY+18*g.scale,'Main language-model loss · CrossEntropy over final logits · MOCK',{title:'Main Loss',category:'Metric',definition:'主语言模型损失：Final Norm 与 LM Head 产生未归一化 logits 后，与 target token 计算 CrossEntropy。它位于最后一个 PP Stage。',values:[['当前值',loss.toFixed(2)],['Mock 参考范围','2.0–4.0'],['数据来源','MOCK']],status:loss<2||loss>4?'abnormal':'normal',statusLabel:loss<2||loss>4?'异常：超出 mock 参考范围':'正常：位于 mock 参考范围',context:`step ${context.step} · MB ${context.microbatch}/${context.microbatchCount} · PP3 · L45 output`});
      label(labels,'pto-training-sidecar__value-label','Checkpoint · every 1000 steps',g.output.x,g.optimizerY+25*g.scale,'Checkpoint save cadence · independent of optimizer-step cadence · MOCK');
      renderFocus(g);
      positionDetailPanel();
    }

    function schedule(){if(!raf)raf=requestAnimationFrame(render);}
    function clearDragPreview(){
      if(dragPreviewRaf){cancelAnimationFrame(dragPreviewRaf);dragPreviewRaf=0;}
      [svg,labels,focus,detailPanel].forEach(node=>{node.style.transform='';});
      labels.style.removeProperty('--pto-sidecar-drag-inverse-x');labels.style.removeProperty('--pto-sidecar-drag-inverse-y');root.classList.remove('is-sidecar-dragging');
    }
    function applyDragPreview(){
      dragPreviewRaf=0;if(!dragging||!dragOrigin||destroyed)return;
      const dx=controller.state.panX-dragOrigin.panX,dy=controller.state.panY-dragOrigin.panY,transform=`translate3d(${dx}px, ${dy}px, 0)`;
      svg.style.transform=transform;labels.style.transform=transform;focus.style.transform=transform;if(selectedDetail)detailPanel.style.transform=transform;
      labels.style.setProperty('--pto-sidecar-drag-inverse-x',`${-dx}px`);labels.style.setProperty('--pto-sidecar-drag-inverse-y',`${-dy}px`);
    }
    function queueDragPreview(){if(!dragPreviewRaf)dragPreviewRaf=requestAnimationFrame(applyDragPreview);}
    function fitSidecar(){
      if(!controller||!viewport)return api;
      if(controller.state.view!=='right'){controller.fit();schedule();return api;}
      const width=Math.max(1,viewport.clientWidth),height=Math.max(1,viewport.clientHeight);
      const topReserve=Number(options.topLaneReserve)||260,bottomReserve=Number(options.bottomLaneReserve)||130;
      const usableHeight=Math.max(420,height-topReserve-bottomReserve),zoom=clamp(Math.min(width/3000,usableHeight/1900),.12,.86);
      fitZoom=zoom;controller.setPose({zoom,panY:(topReserve-bottomReserve)/2});schedule();return api;
    }
    function queueSidecarFit(){requestAnimationFrame(fitSidecar);}
    function selectLayer(layer){
      selectedLayer=layer===null||layer===undefined||!Number.isFinite(Number(layer))?null:clamp(Number(layer),0,controller.config.layerCount-1);
      schedule();options.onLayerSelect?.(selectedLayer===null?null:{layer:selectedLayer,snapshot:snapshotFor(selectedLayer)},api);return api;
    }
    function setLayerSnapshot(layer,data){const key=Number(layer);if(Number.isFinite(key)){if(data)snapshots.set(key,data);else snapshots.delete(key);schedule();}return api;}
    function eventLayer(event){const target=event.target.closest?.('.pto-training-sidecar__layer-hit');return target?Number(target.dataset.layer):null;}
    function click(event){const layer=eventLayer(event);if(layer!==null&&Number.isFinite(layer))selectLayer(layer===selectedLayer?null:layer);}
    function detailClick(event){const target=event.target.closest?.('[data-detail]');if(!target||target.closest('.pto-training-sidecar__inspector')||target.classList.contains('pto-training-sidecar__layer-hit'))return;try{openDetail(JSON.parse(target.dataset.detail),target);}catch(error){openDetail({title:'Annotation',category:'Detail',definition:target.dataset.tip||'Sidecar annotation',status:'info',statusLabel:'语义说明'},target);}}
    function protectDetailPointer(event){if(event.target.closest?.('[data-detail],.pto-training-sidecar__inspector'))event.stopPropagation();}
    function keydown(event){
      const layer=eventLayer(event);
      if((event.key==='Enter'||event.key===' ')&&layer!==null&&Number.isFinite(layer)){event.preventDefault();selectLayer(layer===selectedLayer?null:layer);return;}
      if(event.key==='Escape'&&selectedDetail){event.preventDefault();openDetail(null);return;}
      if(event.key==='Escape'&&selectedLayer!==null){event.preventDefault();selectLayer(null);return;}
      if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&selectedLayer!==null){event.preventDefault();selectLayer(selectedLayer+(event.key==='ArrowLeft'?-1:1));}
    }
    function interaction(){schedule();}
    function tooltipTarget(event){return event.target.closest?.('[data-tip]');}
    function showTooltip(event){const target=tooltipTarget(event);if(!target)return;tooltip.textContent=target.dataset.tip;tooltip.classList.add('is-visible');moveTooltip(event);}
    function moveTooltip(event){if(!tooltip.classList.contains('is-visible'))return;const rect=viewport.getBoundingClientRect(),x=clamp(event.clientX-rect.left+12,8,rect.width-tooltip.offsetWidth-8),y=clamp(event.clientY-rect.top+12,8,rect.height-tooltip.offsetHeight-8);tooltip.style.left=`${x}px`;tooltip.style.top=`${y}px`;}
    function hideTooltip(event){if(event.relatedTarget?.closest?.('[data-tip]'))return;tooltip.classList.remove('is-visible');}
    function pointerDown(event){if(event.button!==0||event.target.closest('[data-stage-ui],button'))return;dragging=true;dragOrigin={panX:controller.state.panX,panY:controller.state.panY};root.classList.add('is-sidecar-dragging');tooltip.classList.remove('is-visible');}
    function pointerMove(event){if(dragging)queueDragPreview();else moveTooltip(event);}
    function pointerUp(){if(!dragging)return;dragging=false;dragOrigin=null;schedule();}
    svg.addEventListener('click',click);svg.addEventListener('keydown',keydown);viewport.addEventListener('click',detailClick);viewport.addEventListener('pointerover',showTooltip);viewport.addEventListener('pointerdown',protectDetailPointer,true);viewport.addEventListener('pointerdown',pointerDown);viewport.addEventListener('pointermove',pointerMove);viewport.addEventListener('pointerup',pointerUp);viewport.addEventListener('pointercancel',pointerUp);viewport.addEventListener('pointerout',hideTooltip);viewport.addEventListener('wheel',interaction,{passive:true});
    const observer=global.ResizeObserver?new ResizeObserver(()=>{fitSidecar();schedule();}):null;observer?.observe(viewport);
    const fitButton=root.querySelector('[data-deck-fit]'),fitClick=()=>queueSidecarFit();fitButton?.addEventListener('click',fitClick);
    const baseDestroy=controller.destroy.bind(controller);
    const api={
      root,base:controller,get selectedLayer(){return selectedLayer;},get selectedDetail(){return selectedDetail;},mockSnapshot,selectLayer,collapseLayer(){return selectLayer(null);},openDetail,closeDetail(){return openDetail(null);},setLayerSnapshot,
      setView(view){controller.setView(view);queueSidecarFit();return api;},setParallelMode(mode){controller.setParallelMode(mode);schedule();return api;},setTheme(theme){controller.setTheme(theme);schedule();return api;},setZoom(value){controller.setZoom(value);schedule();return api;},setPose(pose){controller.setPose(pose);schedule();return api;},setFrontLayer(layer){controller.setFrontLayer(layer);schedule();return api;},selectNode(nodeId,layer){return controller.selectNode(nodeId,layer);},fit(){return fitSidecar();},refresh(){controller.refresh();schedule();return api;},
      destroy(){destroyed=true;cancelAnimationFrame(raf);cancelAnimationFrame(dragPreviewRaf);observer?.disconnect();fitButton?.removeEventListener('click',fitClick);svg.removeEventListener('click',click);svg.removeEventListener('keydown',keydown);viewport.removeEventListener('click',detailClick);viewport.removeEventListener('pointerover',showTooltip);viewport.removeEventListener('pointerdown',protectDetailPointer,true);viewport.removeEventListener('pointerdown',pointerDown);viewport.removeEventListener('pointermove',pointerMove);viewport.removeEventListener('pointerup',pointerUp);viewport.removeEventListener('pointercancel',pointerUp);viewport.removeEventListener('pointerout',hideTooltip);viewport.removeEventListener('wheel',interaction);baseDestroy();}
    };
    requestAnimationFrame(()=>{fitSidecar();if(options.initialLayer!==null&&options.initialLayer!==undefined&&Number.isFinite(Number(options.initialLayer)))selectLayer(Number(options.initialLayer));});
    return api;
  }

  global.PtoModelArchitectureTrainingSidecar={render:mount,mount,mockSnapshot};
})(window);
