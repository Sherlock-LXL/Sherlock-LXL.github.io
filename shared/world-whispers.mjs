const lines={
  nexus:{
    day:'星塔不会催你。四座岛，按自己的顺序慢慢走。',
    night:'夜里的星塔更安静，也更容易看见已经点亮的光。',
    complete:'四座岛的回应已经汇到这里。这个世界记住了你的路线。',
  },
  'ai-mountain':{
    day:'语言从山脚开始，一层层学会看见、理解，再开口。',
    night:'山路安静下来后，token 的微光反而更清楚。',
  },
  'science-valley':{
    day:'有些光只存在极短的一瞬，所以实验选择耐心地等待。',
    night:'天色变暗，气泡与波纹成为这座山谷自己的星图。',
  },
  'personal-museum':{
    day:'照片和收藏留下的，不只是结果，也是当时愿意停下来的目光。',
    night:'灯光落在旧作品上，时间看起来像另一种展品。',
  },
  'weiming-studio':{
    day:'旋律常常先出现在海风里，后来才被写进作品。',
    night:'舞台没有熄灭，它只是在等下一次有人靠近。',
  },
};

export function worldWhisper(region,hour,resonanceComplete=false){
  const entry=lines[region]??lines.nexus;
  if(region==='nexus'&&resonanceComplete)return entry.complete;
  return hour>=19||hour<6?entry.night:entry.day;
}
