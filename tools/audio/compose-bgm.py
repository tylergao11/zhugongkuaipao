"""Original game score: 32 bars, D minor pentatonic, 130 BPM, sample-exact loop.
Procedural plucked strings, bamboo-flute-like lead and cinematic wooden percussion.
No third-party music or instrument recordings. Run with numpy and scipy installed.
"""
from pathlib import Path
import json
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)
SR, BPM, BARS = 44100, 130, 32
BEAT = 60 / BPM
N = round(BARS * 4 * BEAT * SR)
mix = np.zeros((N, 2), dtype=np.float64)
rng = np.random.default_rng(20260915)
events = []

def hz(note):
    return 440 * 2 ** ((note - 69) / 12)

def add(signal, beat, gain=1., pan=0., room=.12):
    """Wrap all tails into the loop head, including stereo room reflections."""
    start = round(beat * BEAT * SR)
    indices = (start + np.arange(len(signal))) % N
    balance = np.array([np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4)])
    np.add.at(mix, indices, signal[:, None] * gain * balance)
    for delay, amount, reverse in [(.057, .45, True), (.113, .27, False), (.191, .17, True)]:
        wet = balance[::-1] if reverse else balance
        np.add.at(mix, (indices + round(delay*SR)) % N, signal[:,None]*gain*room*amount*wet)

def pluck(note, duration=1.2, color=1.):
    t = np.arange(round(duration*SR))/SR
    frequency = hz(note)
    result = np.zeros_like(t)
    # Inharmonic, damped partials and a short pick transient give a string-like tone.
    for partial in range(1, 18):
        f = frequency * partial * np.sqrt(1 + .00009*partial*partial)
        if f > SR*.44:
            break
        envelope = np.exp(-t*(2.3 + partial**1.18*1.55/color))
        result += np.sin(2*np.pi*f*t) * envelope * np.sin(partial*1.13) / partial**.94
    result += rng.normal(size=len(t))*.025*np.exp(-t*180)
    result *= np.minimum(t/.003, 1) * np.minimum((duration-t)/.035, 1)
    return result * .45

def flute(note, beats, accent=False):
    duration = beats*BEAT + .085
    t = np.arange(round(duration*SR))/SR
    f = hz(note)
    vibrato = .0026*np.sin(2*np.pi*5.1*t)*np.minimum(t/.22,1)
    bend = -.006*np.exp(-t*32)
    phase = np.cumsum(2*np.pi*f*(1+vibrato+bend)/SR)
    envelope = (1-np.exp(-t*65))*np.clip((duration-t)/.075,0,1)
    envelope *= .83+.17*np.exp(-t*8)
    breath = sosfilt(butter(2, [1700,5600], btype='bandpass',fs=SR,output='sos'),rng.normal(size=len(t)))
    signal = np.sin(phase)+.25*np.sin(phase*2+.13)+.11*np.sin(phase*3)+.055*np.sin(phase*5)
    return (signal*.34+breath*.05)*envelope*(1.08 if accent else 1)

def drum(kind, strength=1):
    duration = {'low':.55,'rim':.11,'wood':.10,'shaker':.07,'cymbal':1.5}[kind]
    t = np.arange(round(duration*SR))/SR
    noise = rng.normal(size=len(t))
    if kind=='low':
        freq=62+80*np.exp(-t*32)
        phase=np.cumsum(2*np.pi*freq/SR)
        signal=np.sin(phase)*np.exp(-t*8)+.22*np.sin(phase*1.62)*np.exp(-t*17)+noise*.10*np.exp(-t*100)
    elif kind=='rim':
        signal=(np.sin(2*np.pi*172*t)+.45*np.sin(2*np.pi*315*t))*np.exp(-t*32)+noise*.33*np.exp(-t*48)
    elif kind=='wood':
        signal=(np.sin(2*np.pi*820*t)+.4*np.sin(2*np.pi*1393*t)+.2*np.sin(2*np.pi*2110*t))*np.exp(-t*60)
    elif kind=='shaker':
        signal=sosfilt(butter(2,4500,btype='highpass',fs=SR,output='sos'),noise)*np.exp(-t*60)*.22
    else:
        signal=sum(np.sin(2*np.pi*f*t) for f in [2130,2871,3981,4747,6109,7951])*.08
        signal=(signal+noise*.065)*np.exp(-t*3.9)
    return signal*np.minimum(t/.0015,1)*np.minimum((duration-t)/.008,1)*strength

# (beat within bar, MIDI pitch, held beats), hand-written melodic phrases.
A = [
 [(0,74,.45),(.75,77,.2),(1,79,.45),(1.5,81,.4),(2.25,79,.45),(3,77,.35),(3.5,74,.3)],
 [(0,72,.4),(.5,74,.4),(1.5,77,.7),(2.5,79,.4),(3,77,.35),(3.5,74,.3)],
 [(0,81,.65),(1,84,.45),(1.75,81,.2),(2,79,.4),(2.75,77,.2),(3,79,.7)],
 [(0,77,.4),(.75,74,.2),(1,72,.6),(2,69,.4),(3,72,.7)],
 [(0,74,.4),(.5,77,.35),(1.25,79,.2),(1.5,81,.4),(2.5,84,.4),(3.25,81,.5)],
 [(0,79,.65),(1,77,.35),(1.5,74,.4),(2.5,77,.4),(3,79,.65)],
 [(0,81,.45),(.75,79,.2),(1,77,.4),(1.5,74,.4),(2.25,72,.45),(3,74,.7)],
 [(0,77,.4),(.5,74,.4),(1.25,72,.3),(2,69,.7),(3.5,72,.25)],
]
B = [
 [(0,81,.85),(1.5,84,.35),(2,86,.8),(3,84,.6)],
 [(0,81,.4),(.75,79,.2),(1,77,.65),(2.5,79,.4),(3,81,.65)],
 [(0,79,.65),(1,81,.35),(1.5,84,.4),(2.5,81,.35),(3,79,.65)],
 [(0,77,1.1),(1.5,74,.45),(2.5,72,.35),(3,74,.65)],
 [(0,86,.6),(1,84,.4),(1.5,81,.35),(2.25,79,.45),(3,81,.7)],
 [(0,84,.6),(1,81,.35),(1.5,79,.35),(2.5,77,.4),(3,74,.7)],
 [(0,79,.35),(.5,77,.35),(1,74,.6),(2,72,.35),(2.5,74,.35),(3,77,.7)],
 [(0,79,.35),(.5,77,.35),(1,74,1.1),(3,72,.3),(3.5,74,.25)],
]
chords = [(50,57,62,65),(46,53,58,62),(48,55,60,64),(45,52,57,60),
          (50,57,62,65),(43,50,55,58),(48,55,60,64),(45,52,57,62)]

for bar in range(BARS):
    start=bar*4
    section=bar//8
    chord=chords[bar%8]
    # Plucked-string ostinato: stable rhythm, changing voicings, alternate stereo sides.
    pattern=[2,1,3,1,2,0,3,1]
    for step,index in enumerate(pattern):
        timing=start+step*.5+(0.018 if step%2 else 0)
        note=chord[index]+12
        add(pluck(note,1.0,1.1),timing,.21 if step%2==0 else .145,-.35,.20)
        events.append(['pluck',round(timing,3),note])
    for beat,note,gain in [(0,chord[0]-.0,.25),(1.5,chord[1]-12,.16),(2.5,chord[0],.20),(3.5,chord[1]-12,.12)]:
        add(pluck(note,.9,.65),start+beat,gain,0,.05)
    phrase=(B if section==2 else A)[bar%8]
    # First phrase led by strings, then flute enters; final section adds bright answers.
    for offset,note,length in phrase:
        position=start+offset
        if section==0 and bar<4:
            add(pluck(note,length*BEAT+.3,1.2),position,.34,.17,.28)
        else:
            add(flute(note,length,offset==0),position,.22 if section!=2 else .245,.12,.26)
            if section==3:
                add(pluck(note-12,.75,.9),position,.15,-.23,.16)
        events.append(['melody',position,note,length])
    if bar%4 in [1,3]:
        for offset,note in [(2.75,chord[2]+24),(3.25,chord[1]+24),(3.75,chord[2]+24)]:
            add(pluck(note,.7,1.4),start+offset,.095,.55,.3)
    for offset,amp in [(0,.37),(1.5,.19),(2,.31),(3.5,.18)]:
        add(drum('low'),start+offset,amp,0,.13)
    for offset in [1,3]:
        add(drum('rim'),start+offset,.145,-.17,.16)
    for offset in [.5,1.25,2.5,3.25]:
        add(drum('wood'),start+offset,.13 if offset%1==.5 else .07,.4,.22)
    for step in range(8):
        add(drum('shaker'),start+step*.5,.26 if step%2 else .13,-.48,.05)
    if bar%8==0:
        add(drum('cymbal'),start,.19,.32,.2)
    if bar%8==7:
        for offset,amp in [(3,.10),(3.25,.14),(3.5,.18),(3.75,.24)]:
            add(drum('rim'),start+offset,amp,(offset-3.4)*.4,.15)

# A short circular room tail: the end feeds the beginning instead of being faded to silence.
dry=mix.copy()
for delay,amount in [(.29,.045),(.41,.03),(.61,.018)]:
    mix += np.roll(dry,round(delay*SR),axis=0)[:,::-1]*amount
mix -= mix.mean(axis=0)
mix=np.tanh(mix*1.45)
mix *= .88/max(np.max(np.abs(mix)),1e-9)
pcm=np.round(mix*32767).astype(np.int16)
write(OUT/'liu-run-loop-master.wav',SR,pcm)
manifest={'title':'溜为上策','bpm':BPM,'bars':BARS,'beatsPerBar':4,'duration':N/SR,'sampleRate':SR,'samples':N,'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),'loopJump':float(np.max(np.abs(mix[0]-mix[-1]))),'instruments':['synthesized plucked strings','bamboo-flute-like lead','low war drums','wood blocks','shakers'],'composition':'Original melody and procedural instruments; no third-party audio samples.'}
(OUT/'bgm-score.json').write_text(json.dumps({'metadata':manifest,'events':events},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
