import React, { useState } from 'react';
import { DollarSign, Settings as SettingsIcon, FileText, ArrowUpRight, Download, Plus } from 'lucide-react';

export default function DashboardFinance() {
    const [activeTab, setActiveTab] = useState<'payout' | 'settings' | 'invoice'>('payout');

    return (
        <div className="px-4 md:px-8 py-8 w-full">
            <div className="flex items-center justify-between gap-4 mb-6 md:mb-12">
                <div>
                    <h1 className="text-[52px] font-bold tracking-tight text-black mb-2 leading-none">
                        Finance
                    </h1>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button className="bg-black text-white px-3 py-2 md:px-6 md:py-3 font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shrink-0">
                        <Download className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="text-sm md:text-base">
                            <span className="md:hidden">Export</span>
                            <span className="hidden md:inline">Export Report</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-black/5">
                {[
                    { id: 'payout', label: 'Payout', icon: DollarSign },
                    { id: 'settings', label: 'Settings', icon: SettingsIcon },
                    { id: 'invoice', label: 'Invoice', icon: FileText }
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isActive
                                    ? 'bg-black text-white'
                                    : 'bg-black/5 text-black hover:bg-black/10'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-black/60'}`} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="w-full">

                {activeTab === 'payout' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-2">Available Balance</h3>
                                <p className="text-4xl font-bold tracking-tight text-black">₦450,000</p>
                                <button className="mt-6 w-full py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                                    Request Payout
                                </button>
                            </div>
                            <div className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm md:col-span-2">
                                <h3 className="text-black/40 text-xs font-sans uppercase tracking-widest mb-6">Recent Activity</h3>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-black/5 transition-colors border border-black/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                                    <ArrowUpRight className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-black text-sm">Payout Processed</p>
                                                    <p className="text-xs text-black/40 mt-0.5">Sep 1{i}, 2025</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-black text-sm">₦120,500</p>
                                                <p className="text-[10px] font-medium uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">Completed</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white border border-black/5 p-6 md:p-8 rounded-2xl shadow-sm max-w-3xl">
                            <h2 className="text-xl font-bold text-black mb-6">Bank Accounts</h2>
                            <div className="space-y-4 mb-8">
                                <div className="border border-black/10 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-black/40">GTB</div>
                                        <div>
                                            <p className="font-medium text-black">GTBank **** 4589</p>
                                            <p className="text-sm text-black/40">John Doe • Default</p>
                                        </div>
                                    </div>
                                    <button className="text-sm font-medium text-black/40 hover:text-black transition-colors px-3 py-1.5 border border-black/10 rounded-lg">Edit</button>
                                </div>
                            </div>
                            <button className="flex items-center gap-2 text-sm font-medium text-black hover:text-gray-700 transition-colors">
                                <Plus className="w-4 h-4" /> Add New Bank Account
                            </button>

                            <hr className="my-8 border-black/5" />

                            <h2 className="text-xl font-bold text-black mb-6">Payout Schedule</h2>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <label className="flex-1 flex items-start gap-3 p-4 border border-black border-2 rounded-xl cursor-pointer">
                                    <input type="radio" name="schedule" defaultChecked className="mt-1" />
                                    <div>
                                        <h4 className="font-bold text-black">Automatic</h4>
                                        <p className="text-xs text-black/60 mt-1">Payouts are sent daily for processed transactions.</p>
                                    </div>
                                </label>
                                <label className="flex-1 flex items-start gap-3 p-4 border border-black/10 rounded-xl cursor-pointer hover:border-black/30 transition-colors">
                                    <input type="radio" name="schedule" className="mt-1" />
                                    <div>
                                        <h4 className="font-bold text-black">Manual</h4>
                                        <p className="text-xs text-black/60 mt-1">You initiate payouts when you want them.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'invoice' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white border md:border-black/5 overflow-hidden border-transparent rounded-2xl shadow-sm">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-gray-50/50">
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Invoice Number</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Date issued</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Amount</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40">Status</th>
                                            <th className="px-6 py-4 text-xs font-sans font-medium uppercase tracking-widest text-black/40 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5">
                                        {[1, 2, 3, 4, 5].map((_, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-black">INV-2025-{1000 + i}</td>
                                                <td className="px-6 py-4 text-sm text-black/60">Oct 1{i}, 2025</td>
                                                <td className="px-6 py-4 font-medium text-black">₦{45000 + (i * 15000)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${i === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                        {i === 0 ? 'Pending' : 'Paid'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-sm font-medium text-black/40 hover:text-black transition-colors flex items-center justify-end w-full gap-2">
                                                        <Download className="w-4 h-4" /> PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
