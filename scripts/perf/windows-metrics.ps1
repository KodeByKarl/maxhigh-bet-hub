param([int]$DatabasePid,[string]$StopFile)
$ErrorActionPreference='Stop'
while (-not (Test-Path -LiteralPath $StopFile)) {
  try {
    $taskDb=Get-Process -Id $DatabasePid
    $taskIo=Get-CimInstance Win32_Process -Filter "ProcessId=$DatabasePid"
    $taskMemory=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory
    $taskDisk=Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'"
    $taskPageFile=Get-CimInstance Win32_PageFileUsage | Measure-Object CurrentUsage -Sum
    @{at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();dbPid=$DatabasePid;dbCpuSeconds=$taskDb.CPU;dbRssBytes=$taskDb.WorkingSet64;dbPrivateBytes=$taskDb.PrivateMemorySize64;dbIoReadBytes=$taskIo.ReadTransferCount;dbIoWriteBytes=$taskIo.WriteTransferCount;hostDiskReadBytesPerSecond=$taskDisk.DiskReadBytesPersec;hostDiskWriteBytesPerSecond=$taskDisk.DiskWriteBytesPersec;hostAvailableMiB=$taskMemory.AvailableMBytes;hostPageReadsPerSecond=$taskMemory.PageReadsPersec;hostPageWritesPerSecond=$taskMemory.PageWritesPersec;hostPageFileUsedMiB=$taskPageFile.Sum} | ConvertTo-Json -Compress -Depth 3
  } catch { @{error='Windows performance counters unavailable'} | ConvertTo-Json -Compress }
  Start-Sleep -Seconds 1
}
