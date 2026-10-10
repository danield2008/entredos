/* ENTREDOS_ENHANCEMENTS_V1: local answers, configurable length and visible sharing. */
let localQuestionLimit = 10;
let localQuestionPosition = 1;
let localQuestionHistory = [];
let localFirstAnswer = "";
let localSecondAnswer = "";
let localAnswerStage = 1;
let localRevealed = false;

(function installEnhancementMarkup(){
  const pickerFooter = $('.question-picker .picker-footer');
  if (pickerFooter && !$('#localQuestionCount')) {
    const control = document.createElement('label');
    control.className = 'question-count-control';
    control.htmlFor = 'localQuestionCount';
    control.innerHTML = '<span>Preguntas por partida</span><select id="localQuestionCount" aria-label="Número de preguntas"><option value="5">5 preguntas</option><option value="10" selected>10 preguntas</option><option value="15">15 preguntas</option><option value="20">20 preguntas</option></select>';
    pickerFooter.insertBefore(control, $('#pickerRandom'));
  }

  const topicField = $('#remoteCreatorTopic')?.closest('.remote-field');
  if (topicField && !$('#remoteCreatorCount')) {
    const control = document.createElement('label');
    control.className = 'remote-field';
    control.htmlFor = 'remoteCreatorCount';
    control.innerHTML = '<span>Duración de la partida</span><select id="remoteCreatorCount" aria-label="Número de preguntas"><option value="5">5 preguntas</option><option value="10" selected>10 preguntas</option><option value="15">15 preguntas</option><option value="20">20 preguntas</option></select>';
    topicField.insertAdjacentElement('afterend', control);
  }

  const promptCard = $('#promptText')?.closest('.prompt-card');
  if (promptCard && !$('#localAnswerStation')) {
    const station = document.createElement('section');
    station.id = 'localAnswerStation';
    station.className = 'local-answer-station';
    station.innerHTML = '<div class="local-answer-top"><div><span class="local-answer-kicker">EN PERSONA · POR TURNOS</span><h3 id="localAnswerTitle">Turno de Alex</h3><p id="localAnswerInstructions">Cada persona escribe su respuesta sin ver la del otro.</p></div><span class="local-answer-counter" id="localQuestionCounter">Pregunta 1 de 10</span></div><div id="localAnswerEntry"><label class="local-answer-label" id="localAnswerLabel" for="localAnswerInput">Respuesta de Alex</label><textarea id="localAnswerInput" maxlength="600" rows="4" placeholder="Escribe tu respuesta…"></textarea><div class="local-answer-entry-footer"><span id="localAnswerNote">La respuesta quedará oculta hasta que ambos hayáis respondido.</span><button type="button" class="btn btn-dark" id="localAnswerSubmit">Guardar respuesta ↗</button></div></div><div id="localAnswerReveal" class="local-answer-reveal" style="display:none"><div class="local-result-heading"><span>✦ RESULTADO</span><h3>Vuestras respuestas</h3><p>Leed lo que ha compartido cada uno y comentadlo juntos.</p></div><div class="local-result-grid"><article><span id="localResultName1">Alex</span><p id="localResultAnswer1"></p></article><article><span id="localResultName2">Sam</span><p id="localResultAnswer2"></p></article></div></div>';
    promptCard.insertAdjacentElement('afterend', station);
  }

  const station = $('#localAnswerStation');
  if (station && !$('#localFinalResults')) {
    const final = document.createElement('section');
    final.id = 'localFinalResults';
    final.className = 'local-final-results';
    final.style.display = 'none';
    final.innerHTML = '<div class="local-result-heading"><span>♡ RESULTADO DE LA PARTIDA</span><h2>Habéis compartido vuestro momento.</h2><p id="localFinalSummary">Habéis completado 10 preguntas.</p></div><div id="localFinalList" class="local-final-list"></div><div class="local-final-actions"><button class="btn btn-light" type="button" id="localFinalClose">Cerrar resultado</button><button class="btn btn-dark" type="button" id="localFinalAgain">Jugar otra vez ↗</button></div>';
    station.insertAdjacentElement('afterend', final);
  }

  // Give the invitation its own full-width row so it cannot be clipped beside the code.
  const shareButton = $('#remoteShareInvite');
  const codeBanner = $('.remote-code-banner');
  if (shareButton && codeBanner && !$('#remoteShareRow')) {
    const row = document.createElement('div');
    row.id = 'remoteShareRow';
    row.className = 'remote-share-row';
    const copy = document.createElement('div');
    copy.className = 'remote-share-copy';
    copy.innerHTML = '<strong>Invita a tu pareja</strong><span>Comparte el enlace o el código para que pueda entrar desde su dispositivo.</span>';
    row.append(copy, shareButton);
    codeBanner.insertAdjacentElement('afterend', row);
  }

  const revealHeading = $('#remoteReveal h3');
  if (revealHeading) revealHeading.textContent = 'Resultado · vuestras respuestas';
})();

function renderLocalAnswerStage(){
  const station = $('#localAnswerStation');
  if (!station) return;
  const active = mode === 'questions' && $('#jugar')?.classList.contains('play-open');
  $('#jugar')?.classList.toggle('local-question-active', !!active);
  station.style.display = active ? 'block' : 'none';
  const final = $('#localFinalResults');
  if (final && active) final.style.display = 'none';
  const promptCard = $('#promptText')?.closest('.prompt-card');
  if (promptCard && active) promptCard.style.display = '';
  const progress = $('#progressBar')?.closest('.progress-wrap');
  if (progress && active) progress.style.display = '';
  const actions = $('#saveBtn')?.closest('.game-actions');
  if (actions && active) actions.style.display = '';
  const toastInline = $('#toastInline');
  if (toastInline && active) toastInline.style.display = '';
  if (!active) return;

  const name1 = p1();
  const name2 = p2();
  $('#localQuestionCounter').textContent = 'Pregunta ' + localQuestionPosition + ' de ' + localQuestionLimit;
  $('#localAnswerTitle').textContent = localRevealed ? 'Resultado · pregunta ' + localQuestionPosition : 'Turno de ' + (localAnswerStage === 1 ? name1 : name2);
  $('#localAnswerInstructions').textContent = localRevealed
    ? 'Los dos habéis respondido. Leed las respuestas y comentad qué habéis descubierto.'
    : (localAnswerStage === 1
      ? name1 + ', escribe primero tu respuesta. Después pasaréis el dispositivo a ' + name2 + '.'
      : 'Respuesta de ' + name1 + ' guardada. Pasa el dispositivo a ' + name2 + '; no se muestra lo que ha escrito ' + name1 + '.');
  $('#localAnswerLabel').textContent = 'Respuesta de ' + (localAnswerStage === 1 ? name1 : name2);
  $('#localAnswerInput').placeholder = 'Escribe tu respuesta, ' + (localAnswerStage === 1 ? name1 : name2) + '…';
  $('#localAnswerNote').textContent = localAnswerStage === 1
    ? 'Tu respuesta permanece oculta mientras responde la otra persona.'
    : 'La primera respuesta sigue oculta. Escribe la tuya para ver las dos.';
  $('#localAnswerEntry').style.display = localRevealed ? 'none' : 'block';
  $('#localAnswerReveal').style.display = localRevealed ? 'block' : 'none';
  $('#localAnswerInput').disabled = !!localRevealed;
  $('#localAnswerSubmit').disabled = !!localRevealed;
  $('#nextBtn').hidden = !localRevealed;
  $('#nextBtn').textContent = localQuestionPosition >= localQuestionLimit ? 'Ver resultado final →' : 'Siguiente pregunta →';
  $('#passBtn').hidden = true;
  $('#shuffleBtn').hidden = true;

  if (localRevealed) {
    $('#localResultName1').textContent = name1;
    $('#localResultAnswer1').textContent = localFirstAnswer;
    $('#localResultName2').textContent = name2;
    $('#localResultAnswer2').textContent = localSecondAnswer;
  }
}

function submitLocalAnswer(){
  const input = $('#localAnswerInput');
  const value = (input?.value || '').trim();
  if (!value) { toast('Escribe tu respuesta antes de continuar.'); input?.focus(); return; }
  if (localAnswerStage === 1) {
    localFirstAnswer = value;
    localAnswerStage = 2;
    input.value = '';
    renderLocalAnswerStage();
    input.focus();
    return;
  }
  localSecondAnswer = value;
  localRevealed = true;
  localQuestionHistory.push({
    question: current?.text || '',
    category: current?.category || 'Pregunta',
    name1: p1(),
    answer1: localFirstAnswer,
    name2: p2(),
    answer2: localSecondAnswer
  });
  input.value = '';
  renderLocalAnswerStage();
}

function escapeLocalResult(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function showLocalFinalResults(){
  const promptCard = $('#promptText')?.closest('.prompt-card');
  const station = $('#localAnswerStation');
  const final = $('#localFinalResults');
  const progress = $('#progressBar')?.closest('.progress-wrap');
  const actions = $('#saveBtn')?.closest('.game-actions');
  const toastInline = $('#toastInline');
  if (promptCard) promptCard.style.display = 'none';
  if (station) station.style.display = 'none';
  if (progress) progress.style.display = 'none';
  if (actions) actions.style.display = 'none';
  if (toastInline) toastInline.style.display = 'none';
  if (!final) return;
  final.style.display = 'block';
  $('#localFinalSummary').textContent = 'Resultado: habéis completado ' + localQuestionHistory.length + ' de ' + localQuestionLimit + ' preguntas. No hay una respuesta ganadora: el resultado es lo que habéis compartido y descubierto juntos.';
  $('#localFinalList').innerHTML = localQuestionHistory.map((item, i) =>
    '<article class="local-final-item"><div class="local-final-item-title"><span>Pregunta ' + (i+1) + ' · ' + escapeLocalResult(item.category) + '</span><strong>' + escapeLocalResult(item.question) + '</strong></div><div class="local-final-answer-grid"><div><span>' + escapeLocalResult(item.name1) + '</span><p>' + escapeLocalResult(item.answer1) + '</p></div><div><span>' + escapeLocalResult(item.name2) + '</span><p>' + escapeLocalResult(item.answer2) + '</p></div></div></article>'
  ).join('');
  $('#jugar')?.classList.remove('local-question-active');
}

const originalSetSpecificQuestionForLocal = setSpecificQuestion;
setSpecificQuestion = function(text){
  const found = allQuestions.find(x => x.text === text) || saved.find(x => x.text === text);
  if (deck === 'saved' || pickerDeck === 'saved' || libraryFilter === 'saved') {
    deck = found?.categoryKey || found?.category || 'romantic';
  }
  localQuestionLimit = Number($('#localQuestionCount')?.value || 10);
  localQuestionPosition = 1;
  localQuestionHistory = [];
  localFirstAnswer = '';
  localSecondAnswer = '';
  localAnswerStage = 1;
  localRevealed = false;
  originalSetSpecificQuestionForLocal(text);
  renderLocalAnswerStage();
};

choosePickerQuestion = function(q){
  if (!q) return;
  deck = pickerDeck === 'saved' ? (q.categoryKey || q.category || 'romantic') : pickerDeck;
  $$( '[data-deck]' ).forEach(b => b.classList.toggle('active', b.dataset.deck === deck));
  closeQuestionPicker();
  setSpecificQuestion(q.text);
};

const originalNextQuestionForLocal = nextQuestion;
nextQuestion = function(){
  if (mode !== 'questions' || !$('#jugar')?.classList.contains('local-question-active')) {
    return originalNextQuestionForLocal();
  }
  if (!localRevealed) { toast('Primero tenéis que responder los dos.'); return; }
  if (localQuestionPosition >= localQuestionLimit) {
    showLocalFinalResults();
    return;
  }
  localQuestionPosition += 1;
  round += 1;
  localFirstAnswer = '';
  localSecondAnswer = '';
  localAnswerStage = 1;
  localRevealed = false;
  renderQuestion();
  renderLocalAnswerStage();
};

const originalCreateRemoteRoomForLimit = createRemoteRoom;
createRemoteRoom = async function(){
  const button = $('#createRemoteRoom');
  button.disabled = true;
  button.textContent = 'Creando sala…';
  $('#remoteCreateError').textContent = '';
  try {
    const data = await remoteRequest('create', {
      topic: $('#remoteCreatorTopic').value,
      name: $('#remoteCreatorName').value.trim(),
      question_limit: Number($('#remoteCreatorCount')?.value || 10)
    });
    remoteSession = {code:data.room.code, token:data.token, role:data.role};
    saveRemoteSession();
    openRemoteGame(data);
    toast('Sala creada. Comparte el código con tu pareja.');
  } catch (error) {
    $('#remoteCreateError').textContent = error.message || 'No se pudo crear la sala.';
  } finally {
    button.disabled = false;
    button.textContent = 'Generar código ↗';
  }
};

const originalRenderRemoteStateForLimit = renderRemoteState;
renderRemoteState = function(state){
  originalRenderRemoteStateForLimit(state);
  if (!state?.room) return;
  const room = state.room;
  const pool = remoteQuestionPool(room);
  const limit = Math.min(Number(room.question_limit || 10), pool.length);
  const index = Number(room.question_index || 0);
  $('#remoteRoundCount').textContent = 'Pregunta ' + Math.min(index + 1, limit) + ' de ' + limit;
  if (state.both_answered && index < limit) {
    $('#remoteNext').textContent = index + 1 >= limit ? 'Ver resultado final →' : 'Siguiente pregunta →';
  }
  if (room.status === 'finished' || index >= limit) {
    $('#remoteWaiting').hidden = true;
    $('#remoteRound').hidden = true;
    $('#remoteFinished').hidden = false;
    $('#remoteStatusText').textContent = 'Partida completada';
    $('#remoteFinished p').textContent = 'Resultado: habéis completado ' + limit + ' preguntas juntos. Habéis compartido vuestras respuestas y podéis volver a jugar con otro tema.';
  }
};

$('#localAnswerSubmit').addEventListener('click', submitLocalAnswer);
$('#player1').addEventListener('input', () => { if (!localRevealed) { $('#localAnswerTitle').textContent = 'Turno de ' + (localAnswerStage === 1 ? p1() : p2()); $('#localAnswerLabel').textContent = 'Respuesta de ' + (localAnswerStage === 1 ? p1() : p2()); } });
$('#player2').addEventListener('input', () => { if (!localRevealed) { $('#localAnswerTitle').textContent = 'Turno de ' + (localAnswerStage === 1 ? p1() : p2()); $('#localAnswerLabel').textContent = 'Respuesta de ' + (localAnswerStage === 1 ? p1() : p2()); } });
$('#localFinalClose').addEventListener('click', closePlayWindow);
$('#localFinalAgain').addEventListener('click', () => { closePlayWindow(); openModeChooser('all'); });
