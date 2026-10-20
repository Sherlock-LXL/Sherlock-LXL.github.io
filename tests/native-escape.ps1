param([long]$WindowHandle, [int]$HoldMilliseconds=120)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class XiangMetaTestInput {
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
 [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
 [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
 [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
}
'@
[XiangMetaTestInput]::SetForegroundWindow([IntPtr]$WindowHandle) | Out-Null
Start-Sleep -Milliseconds 150
if ([XiangMetaTestInput]::GetForegroundWindow().ToInt64() -ne $WindowHandle) {
 $inputThread = [XiangMetaTestInput]::GetCurrentThreadId()
 $foregroundThread = [XiangMetaTestInput]::GetWindowThreadProcessId([XiangMetaTestInput]::GetForegroundWindow(), [IntPtr]::Zero)
 $attached = [XiangMetaTestInput]::AttachThreadInput($inputThread, $foregroundThread, $true)
 try {
  [XiangMetaTestInput]::ShowWindow([IntPtr]$WindowHandle, 9) | Out-Null
  [XiangMetaTestInput]::BringWindowToTop([IntPtr]$WindowHandle) | Out-Null
  [XiangMetaTestInput]::SetForegroundWindow([IntPtr]$WindowHandle) | Out-Null
 } finally { if ($attached) { [XiangMetaTestInput]::AttachThreadInput($inputThread, $foregroundThread, $false) | Out-Null } }
 Start-Sleep -Milliseconds 200
}
if ([XiangMetaTestInput]::GetForegroundWindow().ToInt64() -ne $WindowHandle) { throw 'Test window is not foreground; no input sent.' }
try {
 [XiangMetaTestInput]::keybd_event(27,1,0,[UIntPtr]::Zero)
 Start-Sleep -Milliseconds $HoldMilliseconds
} finally { [XiangMetaTestInput]::keybd_event(27,1,2,[UIntPtr]::Zero) }
