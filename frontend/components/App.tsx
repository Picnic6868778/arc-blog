"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ConnectButton } from "./ConnectButton";

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const ABI = [
  { name: "post", type: "function", stateMutability: "nonpayable", inputs: [{ name: "title", type: "string" }, { name: "body", type: "string" }, { name: "price", type: "uint256" }], outputs: [] },
  { name: "tip", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "unlock", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "readBody", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "string" }] },
  { name: "getMeta", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "author", type: "address" }, { name: "title", type: "string" }, { name: "price", type: "uint256" }, { name: "tips", type: "uint256" }, { name: "unlocks", type: "uint256" }, { name: "createdAt", type: "uint256" }] },
  { name: "totalPosts", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const fmt = (a: string) => `${a.slice(0,6)}...${a.slice(-4)}`;

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"read"|"write">("read");
  const [viewId, setViewId] = useState("0");
  const [form, setForm] = useState({ title: "", body: "", price: "0" });
  const { data: total, refetch: rTotal } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalPosts" });
  const { data: meta, refetch: rM } = useReadContract({ address: ADDR, abi: ABI, functionName: "getMeta", args: [BigInt(viewId||"0")] });
  const { data: body, refetch: rB } = useReadContract({ address: ADDR, abi: ABI, functionName: "readBody", args: [BigInt(viewId||"0")], account: address });
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => { if(!isSuccess) return; rTotal(); rM(); rB(); reset(); setForm({title:"",body:"",price:"0"}); setTab("read"); }, [isSuccess]); // eslint-disable-line
  const busy = isPending || isConfirming;
  const locked = meta && meta[2] > 0n && body === "[Premium post - unlock to read]";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="text-2xl">✏️</span><span className="font-bold text-lg">Arc Blog</span><span className="text-xs bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} posts</span></div>
        <ConnectButton />
      </header>
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center"><h1 className="text-4xl font-extrabold bg-gradient-to-br from-sky-400 to-blue-500 bg-clip-text text-transparent">Blog ✏️</h1><p className="text-gray-400 text-sm mt-1">Publish posts, get tips, sell premium</p></div>
        {busy && <div className="text-center text-sm text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-xl py-3 animate-pulse">{isPending ? "Confirm in wallet..." : "Processing..."}</div>}
        <div className="flex gap-2">{(["read","write"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${tab===t?"bg-sky-500 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{t==="write"?"Write Post":"Read"}</button>)}</div>
        {tab === "write" && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Title</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500" /></div>
          <div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Body</label><textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Premium Price (0 = free)</label><input value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500" /></div>
          <button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"post",args:[form.title,form.body,parseEther(form.price||"0")]})} disabled={!isConnected||busy||!form.title} className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:opacity-90 disabled:opacity-40">{busy?"...":"Publish ✏️"}</button>
        </div>}
        {tab === "read" && <div className="space-y-4">
          <input value={viewId} onChange={e=>setViewId(e.target.value)} placeholder="Post ID" type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-500" />
          {meta && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div><h3 className="font-bold text-xl">{meta[1]}</h3><p className="text-xs text-gray-500">by {fmt(meta[0])} · {meta[4].toString()} unlocks · {formatEther(meta[3])} USDC tips</p></div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">{body}</div>
            {locked && <button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"unlock",args:[BigInt(viewId)],value:meta[2]})} disabled={!isConnected||busy} className="w-full py-2.5 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-40">{busy?"...":`Unlock for ${formatEther(meta[2])} USDC`}</button>}
            <button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"tip",args:[BigInt(viewId)],value:parseEther("1")})} disabled={!isConnected||busy} className="w-full py-2 bg-gray-800 text-sky-400 font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-40 text-sm">{busy?"...":"💙 Tip 1 USDC"}</button>
          </div>}
        </div>}
      </main>
      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Arc Network</a></footer>
    </div>
  );
}
