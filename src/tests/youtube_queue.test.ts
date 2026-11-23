/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Studio — Task Queue & Priority Management Test Suite
 */

import { YouTubeQueueService } from '../services/youtubeQueueService';
import { YouTubeVideoPriority, YouTubeVideoJob } from '../types/youtubeQueue';
import { YouTubeService } from '../services/youtubeService';
import { YouTubeConnectedAccount } from '../types/youtube';

// Mock localStorage if in node test environment
if (typeof localStorage === 'undefined' || !localStorage) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

async function runQueueTests() {
  console.log('=== NewsPress YouTube Studio Task Queue & Priority Engine Tests ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      process.exitCode = 1;
    }
  }

  // Reset store and pause network worker during unit tests
  YouTubeQueueService.resetStore();
  YouTubeQueueService.pauseWorker();

  // Test 1: Concurrency Limits Configuration
  console.log('1. Concurrency Limits Configuration:');
  assert(YouTubeQueueService.getMaxConcurrentJobs() === 2, 'Default max concurrent workers is 2');
  YouTubeQueueService.setMaxConcurrentJobs(3);
  assert(YouTubeQueueService.getMaxConcurrentJobs() === 3, 'Max concurrent workers successfully updated to 3');
  YouTubeQueueService.setMaxConcurrentJobs(2); // restore to 2

  // Test 2: Enqueueing Jobs with Different Priorities
  console.log('\n2. Multi-Tier Priority Enqueueing:');
  const dummyPayload = {
    newsText: 'భారీ వర్షాలు కురుస్తున్నాయి. నదులు పొంగిపొర్లుతున్నాయి.',
    language: 'te' as const,
    clipDurationMode: 'bulletin' as const,
    activeClipsMeta: [{ name: 'flood_footage.mp4', size: 1024 * 1024 }],
  };

  // Enqueue P3 (Routine) first
  const jobRoutine1 = await YouTubeQueueService.enqueueJob({
    tenantId: 'tenant_etv',
    userId: 'rep_1',
    userName: 'Ramesh Reporter',
    title: 'సాధారణ వ్యవసాయ నివేదిక',
    priority: 'P3_ROUTINE_FIELD_REPORT',
    payload: dummyPayload,
  });
  assert(jobRoutine1.priority === 'P3_ROUTINE_FIELD_REPORT', 'P3 Routine job created with correct priority');

  // Enqueue P2 (Prime-Time) second
  const jobPrime = await YouTubeQueueService.enqueueJob({
    tenantId: 'tenant_etv',
    userId: 'rep_2',
    userName: 'Suresh Editor',
    title: 'రాత్రి 9 గంటల ప్రత్యేక ప్రైమ్‌టైమ్ బులిటెన్',
    priority: 'P2_PRIMETIME_BULLETIN',
    payload: dummyPayload,
  });
  assert(jobPrime.priority === 'P2_PRIMETIME_BULLETIN', 'P2 Prime-Time job created with correct priority');

  // Enqueue P1 (Flash Breaking) last
  const jobFlash = await YouTubeQueueService.enqueueJob({
    tenantId: 'tenant_etv',
    userId: 'rep_3',
    userName: 'Kavitha Anchor',
    title: 'తాజా వార్తలు: తీరంలో భారీ తుఫాన్ అలర్ట్!',
    priority: 'P1_FLASH_BREAKING',
    payload: dummyPayload,
  });
  assert(jobFlash.priority === 'P1_FLASH_BREAKING', 'P1 Flash Breaking job created with correct priority');

  // Test 3: Priority Ordering Verification (P1 > P2 > P3)
  console.log('\n3. Priority Scheduling & Queue Position:');
  const allJobs = YouTubeQueueService.getAllJobs('tenant_etv');
  assert(allJobs.length === 3, 'All 3 jobs stored in queue');

  const queuedJobs = allJobs.filter((j) => j.status === 'QUEUED');
  assert(queuedJobs[0].priority === 'P1_FLASH_BREAKING', 'P1 Flash Breaking job jumped to the head of the queue');
  assert(queuedJobs[0].queuePosition === 1, 'P1 Flash Breaking job assigned Position #1 in line');
  assert(queuedJobs[1].priority === 'P2_PRIMETIME_BULLETIN', 'P2 Prime-Time job is second in line');
  assert(queuedJobs[1].queuePosition === 2, 'P2 Prime-Time job assigned Position #2 in line');
  assert(queuedJobs[2].priority === 'P3_ROUTINE_FIELD_REPORT', 'P3 Routine job is third in line');
  assert(queuedJobs[2].queuePosition === 3, 'P3 Routine job assigned Position #3 in line');

  // Test 4: Priority Promotion in Real-Time
  console.log('\n4. Dynamic Priority Promotion (P3 -> P1):');
  // Promote the routine job (which was at #3) to P1 Flash Breaking
  await YouTubeQueueService.setJobPriority(jobRoutine1.jobId, 'P1_FLASH_BREAKING');
  const promotedList = YouTubeQueueService.getAllJobs('tenant_etv').filter((j) => j.status === 'QUEUED');
  assert(
    promotedList[0].jobId === jobRoutine1.jobId || promotedList[1].jobId === jobRoutine1.jobId,
    'Promoted job is now in the top tier (P1) ahead of P2 jobs'
  );
  assert(promotedList[promotedList.length - 1].priority === 'P2_PRIMETIME_BULLETIN', 'P2 job pushed down behind P1 jobs');

  // Test 5: Job Cancellation & Re-indexing
  console.log('\n5. Job Cancellation & Dynamic Queue Re-indexing:');
  await YouTubeQueueService.cancelJob(jobPrime.jobId, 'Story recalled by editor');
  const afterCancelJobs = YouTubeQueueService.getAllJobs('tenant_etv');
  const cancelledJob = afterCancelJobs.find((j) => j.jobId === jobPrime.jobId);
  assert(cancelledJob?.status === 'CANCELLED', 'Cancelled job status marked as CANCELLED');
  assert(Boolean(cancelledJob?.stageMessage?.includes('Story recalled')), 'Cancellation reason recorded');

  // Test 6: Job Retry
  console.log('\n6. Job Retry Functionality:');
  await YouTubeQueueService.retryJob(jobPrime.jobId);
  const retriedJob = YouTubeQueueService.getJobById(jobPrime.jobId);
  assert(retriedJob?.status === 'QUEUED', 'Retried job status reset to QUEUED');
  assert(retriedJob?.progress === 0, 'Retried job progress reset to 0%');

  // Test 7: Queue Statistics Aggregation
  console.log('\n7. Queue Statistics Aggregation:');
  const stats = YouTubeQueueService.getQueueStats('tenant_etv');
  assert(stats.totalJobs === 3, 'Stats report 3 total jobs');
  assert(stats.queuedCount === 3, 'Stats report 3 queued jobs');
  assert(stats.maxConcurrentWorkers === 2, 'Stats report 2 max concurrent workers');
  assert(typeof stats.activeWorkers === 'number', 'Active workers telemetry is numeric');

  // Test 8: Multi-Tenant Isolation
  console.log('\n8. Multi-Tenant Queue Isolation:');
  await YouTubeQueueService.enqueueJob({
    tenantId: 'tenant_sakshi',
    userId: 'sakshi_rep_1',
    userName: 'Sakshi Correspondent',
    title: 'సాక్షి ప్రత్యేక కథనం',
    priority: 'P1_FLASH_BREAKING',
    payload: dummyPayload,
  });

  const etvJobs = YouTubeQueueService.getAllJobs('tenant_etv');
  const sakshiJobs = YouTubeQueueService.getAllJobs('tenant_sakshi');
  assert(etvJobs.length === 3, 'ETV tenant sees only its 3 jobs');
  assert(sakshiJobs.length === 1, 'Sakshi tenant sees only its 1 job');

  // Test 9: Clear Completed Jobs
  console.log('\n9. Clear Completed Jobs:');
  // Mark one job as PUBLISHED
  const jobToComplete = YouTubeQueueService.getJobById(jobFlash.jobId);
  if (jobToComplete) {
    jobToComplete.status = 'PUBLISHED';
    jobToComplete.youtubeUrl = 'https://www.youtube.com/watch?v=TEST_PUBLISHED_99';
  }
  await YouTubeQueueService.clearCompleted();
  const remaining = YouTubeQueueService.getAllJobs();
  assert(!remaining.some((j) => j.jobId === jobFlash.jobId), 'Completed published job cleared from active list');

  // Test 10: Multi-Channel Account Support (Brand Accounts / Sub-Channels under one Google Account)
  console.log('\n10. Multi-Channel Support (Multiple Channels under Same Account):');
  const channelA: YouTubeConnectedAccount = {
    isConnected: true,
    channelId: 'UC_MAIN_NEWS_01',
    channelTitle: 'Mahaa News Main Bulletins',
    subscriberCount: 250000,
    googleEmail: 'editorial@newspress.com',
  };
  const channelB: YouTubeConnectedAccount = {
    isConnected: true,
    channelId: 'UC_CRIME_NEWS_02',
    channelTitle: 'Mahaa News Crime Special',
    subscriberCount: 85000,
    googleEmail: 'editorial@newspress.com',
  };

  YouTubeService.saveConnectedAccount(channelA);
  YouTubeService.saveConnectedAccount(channelB);

  const channelsList = YouTubeService.getConnectedAccountsList();
  assert(channelsList.length === 2, 'Registry saves multiple channels under the same Google account');
  assert(channelsList.some(c => c.channelId === 'UC_MAIN_NEWS_01'), 'Main channel preserved in list');
  assert(channelsList.some(c => c.channelId === 'UC_CRIME_NEWS_02'), 'Crime channel preserved in list');

  // 1-Click Switch active channel to channelA
  const activeNow = YouTubeService.switchActiveChannel('UC_MAIN_NEWS_01');
  assert(activeNow?.channelTitle === 'Mahaa News Main Bulletins', 'Switches active broadcast channel in 1-click');

  // 1-Click Switch active channel to channelB
  const switchedToB = YouTubeService.switchActiveChannel('UC_CRIME_NEWS_02');
  assert(switchedToB?.channelTitle === 'Mahaa News Crime Special', 'Seamlessly switches to secondary channel');

  // Disconnect single channel without affecting others
  YouTubeService.disconnectYouTubeChannel('UC_MAIN_NEWS_01');
  const afterRemoveList = YouTubeService.getConnectedAccountsList();
  assert(afterRemoveList.length === 1, 'Removed channel is deleted while secondary channel remains connected');
  assert(afterRemoveList[0].channelId === 'UC_CRIME_NEWS_02', 'Crime channel remains active');

  console.log(`\n=== Verification Results: ${passed}/${total} assertions passed ===\n`);
  if (passed === total) {
    console.log('🎉 ALL YOUTUBE TASK QUEUE & PRIORITY ENGINE TESTS PASSED SUCCESSFULLY!');
  }
}

runQueueTests().catch((err) => {
  console.error('Queue test runner failed:', err);
  process.exit(1);
});
