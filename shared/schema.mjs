import { z } from 'zod';
export const idSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const asset = z.string().regex(/^\/assets\/[a-zA-Z0-9_./-]+$/).refine(s => !s.includes('..'));
const externalLink = z.string().url().refine(s => s.startsWith('https://'));
export const portfolioSchema = z.object({
  name: z.string().min(1), category: z.enum(['AI','Research','Engineering','Creative']),
  summary: z.string().min(1), technologies: z.array(z.string()),
  github: externalLink.optional(), demo: externalLink.optional(),
  featured: z.boolean().default(false), order: z.number().int().default(100),
  screenshots: z.array(asset).default([])
});
export const worldModuleSchema=z.object({
  version:z.literal(1),
  capabilities:z.array(z.enum(['conversation','vision','generation','recommendation','simulation','gallery','listening'])).default([]),
  ambience:z.enum(['tokens','fireflies','bubbles','resonance','stage']).optional(),
  audio:asset.optional(),
  fragments:z.array(z.object({id:idSchema,title:z.string().min(1).max(80),body:z.string().min(1).max(1600),
    position:z.tuple([z.number().min(-40).max(40),z.number().min(-40).max(40)]),
    growth:z.object({order:z.number().int().min(0).max(999),label:z.string().max(50)}).optional()
  })).max(24).default([]),
  connections:z.array(z.object({target:idSchema,title:z.string().min(1).max(80),body:z.string().max(1000)})).max(12).default([])
}).superRefine((w,c)=>{if(new Set(w.fragments.map(f=>f.id)).size!==w.fragments.length)c.addIssue({code:'custom',message:'duplicate memory fragment id'});});
export const fieldSchema = z.object({
  key: idSchema, label: z.string(), type: z.enum(['text', 'image', 'number', 'select']),
  default: z.union([z.string(), z.number()]).optional(), placeholder: z.string().optional(),
  min: z.number().optional(), max: z.number().optional(), step: z.number().positive().optional(),
  options: z.array(z.string()).optional()
}).superRefine((f,c) => {
  if (f.type === 'select' && !f.options?.length) c.addIssue({code:'custom',message:'select requires options'});
  if (f.type === 'number' && (f.min === undefined || f.max === undefined || f.min > f.max)) c.addIssue({code:'custom',message:'number requires valid bounds'});
});
export const moduleSchema = z.object({
  schemaVersion: z.literal(1), id: idSchema, title: z.string(), subtitle: z.string(),
  region: idSchema, owner: z.enum(['personal', 'team']), category: z.string(),
  description: z.string(), tags: z.array(z.string()),
  position: z.tuple([z.number().min(-40).max(40), z.number().min(-40).max(40)]),
  rotation:z.union([z.literal(0),z.literal(90),z.literal(180),z.literal(270)]).optional(),
  visual: z.enum(['tower','forest','mirror','garden','gift','bubble','light','gallery','music','studio']),
  visualAsset: z.object({src:asset.refine(s=>s.endsWith('.glb')),scale:z.number().positive().max(100).default(1),rotation:z.number().default(0)}).optional(),
  world:worldModuleSchema.optional(),
  wayfinding:z.object({title:z.string().max(50),subtitle:z.string().max(50)}).optional(),
  portfolio:portfolioSchema.optional(),
  albums:z.array(z.object({id:idSchema,order:z.number().int().positive(),title:z.string(),cover:asset,credit:z.string(),link:externalLink.optional(),tracks:z.array(z.object({id:idSchema,title:z.string(),src:asset.optional(),lyrics:z.string().max(30000)})).default([])})).max(100).optional(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })),
  story: z.array(z.object({ title: z.string(), body: z.string() })),
  interface: z.object({ action: z.string(), fields: z.array(fieldSchema) }).optional(),
  runtime: z.object({ kind: z.literal('python'), sourceKey: idSchema, entry: z.string().regex(/^[a-zA-Z0-9_-]+\.py$/), requires: z.array(z.string()) }).optional(),
  simulation: z.enum(['bubble','sonoluminescence']).optional(),
  media: z.array(z.object({ kind: z.enum(['image','audio','video']), title: z.string(), location:z.string().max(120).optional(),src: asset.optional(), thumbnail:asset.optional(), width:z.number().positive().optional(),height:z.number().positive().optional() })).default([]),
  link: z.string().url().refine(s => s.startsWith('https://')).optional()
}).superRefine((m,c) => {
  if (m.runtime && !m.interface) c.addIssue({code:'custom',message:'runtime requires interface'});
  if (new Set(m.interface?.fields.map(f=>f.key)).size !== (m.interface?.fields.length ?? 0)) c.addIssue({code:'custom',message:'duplicate fields'});
});
export const discoverySchema=z.object({scale:z.number().min(.55).max(1).optional(),kind:z.enum(['butterflies','bubbles','prism','chimes','bloom','orrery','leaves','tides','tokenloom','cloudbell','snowglobe','pendulum','kaleidoscope','vinyl','shell','lighthouse']),title:z.string(),action:z.string(),description:z.string(),position:z.tuple([z.number().min(-40).max(40),z.number().min(-40).max(40)])});
export const regionSchema = z.object({ id:idSchema, title:z.string(), english:z.string(), description:z.string(), color:z.string().regex(/^#[0-9a-f]{6}$/i), position:z.tuple([z.number(),z.number()]), radius:z.number().min(14).max(50), scenery:z.enum(['woodland','laboratory','museum','studio']).default('woodland'),
  spawn:z.tuple([z.number().min(-40).max(40),z.number().min(-40).max(40)]).optional(),
  arrivalPath:z.array(z.tuple([z.number().min(-40).max(40),z.number().min(-40).max(40)])).min(1).max(20).optional(),
  forecourt:z.tuple([z.number(),z.number()]).optional(),
  season:z.enum(['spring','summer','autumn','winter']).optional(),
  terrain:z.object({kind:z.literal('mountain'),arrivalCourt:z.object({center:z.tuple([z.number(),z.number()]),radius:z.number().min(1).max(5),height:z.number().min(0).max(3)}).optional(),height:z.number().min(1).max(30),route:z.object({width:z.number().min(2.5).max(5),points:z.array(z.tuple([z.number(),z.number(),z.number()])).min(2).max(32)}).optional(),terraces:z.array(z.object({center:z.tuple([z.number(),z.number()]),height:z.number().min(0).max(30),radius:z.number().min(3).max(10)})).max(12),shortcuts:z.array(z.object({title:z.string(),profile:z.array(z.tuple([z.number(),z.number(),z.number()])).min(2).max(32).optional(),points:z.array(z.tuple([z.number(),z.number()])).min(2).max(32)})).default([])}).optional(),
  discovery:discoverySchema.optional(),
  discoveries:z.array(discoverySchema.extend({id:idSchema})).max(12).default([]).refine(items=>new Set(items.map(i=>i.id)).size===items.length,'duplicate discovery id')
});
export function validateInput(module, input) {
  const fields = {};
  for (const f of module.interface?.fields ?? []) {
    fields[f.key] = f.type === 'number' ? z.number().finite().min(f.min).max(f.max)
      : f.type === 'select' ? z.enum(f.options)
      : f.type === 'image' ? z.string().max(7_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
      : z.string().trim().min(1).max(f.max ?? 1000);
  }
  return z.object(fields).strict().parse(input);
}
