import sys
f = open('index-BmCB11Ko.js','r')
lines = f.readlines()
f.close()
line = lines[197]
s = line.find('saveRecord:async')
e = line.find('hasRecordForDate:',s)
snip = line[s:e]
sys.stdout.write('len: ' + str(len(snip)) + '\n')
d = 0
first_zero = -1
for i in range(len(snip)):
    c = snip[i]
    if c == '{':
        d += 1
    elif c == '}':
        d -= 1
    if d == 0 and first_zero == -1:
        first_zero = i
sys.stdout.write('final depth: ' + str(d) + '\n')
sys.stdout.write('first zero at: ' + str(first_zero) + '\n')
if first_zero >= 0:
    sys.stdout.write('context: ' + snip[max(0,first_zero-40):first_zero+10] + '\n')
