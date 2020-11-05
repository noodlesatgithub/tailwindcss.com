import { CodeWindow } from '@/components/CodeWindow'
import tokenize from '../../macros/tokenize.macro'
import { Token } from '@/components/Code'
import { AnimateSharedLayout, motion, useAnimation } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { fit } from '@/utils/fit'
import { debounce } from 'debounce'
import styles from './Hero.module.css'
import { useMedia } from '@/hooks/useMedia'

const CHAR_DELAY = 50
const GROUP_DELAY = 1000
const TRANSITION = { duration: 0.5 }

const { tokens, code } = tokenize.html(
  `<div class="md:flex bg-gray-100 rounded-xl p-8">
  <img class="w-32 h-32 md:w-48 md:h-auto md:rounded-none mb-6 md:-m-8 md:mr-8 rounded-full mx-auto" src="https://unsplash.it/200/200?random" alt="" />
  <blockquote class="text-center">
    <p class="mb-4 text-lg leading-7 font-semibold">
      “Tailwind CSS is the only framework that I've seen scale
      on large teams. It’s easy to customize, adapts to any design,
      and the build size is tiny.”
    </p>
    <cite class="not-italic font-medium">
      <span class="text-cyan-600">Sarah Dayan</span><br />
      <span class="text-gray-500">Staff Engineer, Algolia</span>
    </cite>
  </blockquote>
</div>`,
  true
)

function getRange(text) {
  return { start: code.indexOf(text), end: code.indexOf(text) + text.length }
}

const ranges = [
  getRange(' p-8'),
  getRange(' rounded-full'),
  getRange(' mx-auto'),
  getRange(' font-semibold'),
  getRange(' font-medium'),
  getRange(' class="text-cyan-600"'),
  getRange(' class="text-gray-500"'),
  getRange(' class="text-center"'),
  getRange('md:flex '),
  getRange(' md:-m-8 md:mr-8'),
  getRange(' md:rounded-none'),
  getRange(' md:w-48'),
  getRange(' md:h-auto'),
]

function getRangeIndex(index, ranges) {
  for (let i = 0; i < ranges.length; i++) {
    const rangeArr = Array.isArray(ranges[i]) ? ranges[i] : [ranges[i]]
    for (let j = 0; j < rangeArr.length; j++) {
      if (index >= rangeArr[j].start && index < rangeArr[j].end) {
        return [i, index - rangeArr[j].start, index === rangeArr[j].end - 1]
      }
    }
  }
  return [-1]
}

function Words({ children, bolder = false, layout, transition }) {
  return children.split(' ').map((word, i) => (
    <motion.span
      key={i}
      layout={layout}
      className="relative inline-flex whitespace-pre text-lg leading-7"
      transition={transition}
    >
      {bolder ? (
        <>
          <motion.span
            className="absolute top-0 left-0"
            initial={{ fontWeight: 400 }}
            animate={{ fontWeight: 600 }}
            transition={transition}
          >
            {word}{' '}
          </motion.span>
          <span style={{ opacity: 0, fontWeight: 600 }}>{word} </span>
        </>
      ) : (
        word + ' '
      )}
    </motion.span>
  ))
}

function augment(tokens, index = 0) {
  for (let i = 0; i < tokens.length; i++) {
    if (Array.isArray(tokens[i])) {
      const _type = tokens[i][0]
      const children = tokens[i][1]
      if (Array.isArray(children)) {
        index = augment(children, index)
      } else {
        const str = children
        const result = []
        for (let j = 0; j < str.length; j++) {
          const [rangeIndex, indexInRange, isLast] = getRangeIndex(index, ranges)
          if (rangeIndex > -1) {
            result.push([`char:${rangeIndex}:${indexInRange}${isLast ? ':last' : ''}`, str[j]])
          } else {
            if (typeof result[result.length - 1] === 'string') {
              result[result.length - 1] += str[j]
            } else {
              result.push(str[j])
            }
          }
          index++
        }
        if (!(result.length === 1 && typeof result[0] === 'string')) {
          tokens[i].splice(1, 1, result)
        }
      }
    } else {
      const str = tokens[i]
      const result = []
      for (let j = 0; j < str.length; j++) {
        const [rangeIndex, indexInRange, isLast] = getRangeIndex(index, ranges)
        if (rangeIndex > -1) {
          result.push([`char:${rangeIndex}:${indexInRange}${isLast ? ':last' : ''}`, str[j]])
        } else {
          if (typeof result[result.length - 1] === 'string') {
            result[result.length - 1] += str[j]
          } else {
            result.push(str[j])
          }
        }
        index++
      }
      tokens.splice(i, 1, ...result)
      i += result.length - 1
    }
  }
  return index
}

augment(tokens)

export function Hero() {
  const containerRef = useRef()
  const [step, setStep] = useState(-1)
  const [state, setState] = useState({ group: 0, char: 0 })
  const cursorControls = useAnimation()
  const [wide, setWide] = useState(false)
  const [finished, setFinished] = useState(false)
  const supportsMd = useMedia('(min-width: 640px)')
  const [isMd, setIsMd] = useState(false)
  const [containerRect, setContainerRect] = useState()
  const md = supportsMd && isMd

  const layout = !finished

  useEffect(() => {
    if (step === 12) {
      window.setTimeout(() => {
        setFinished(true)
      }, 1000)
    }
  }, [step])

  useEffect(() => {
    if (!finished) return
    cursorControls.start({ opacity: 0.5 })
    const id = window.setInterval(() => {
      cursorControls.start({ opacity: 1, scale: 0.9, transition: { duration: 0.25 } }).then(() => {
        setWide((wide) => !wide)
        cursorControls.start({ opacity: 0.5, scale: 1, transition: { duration: 0.25, delay: 0.6 } })
      })
    }, 2000)
    return () => {
      window.clearInterval(id)
    }
  }, [finished])

  useEffect(() => {
    if (finished) {
      const id = window.setTimeout(() => {
        setIsMd(wide)
      }, 250)
      return () => window.clearTimeout(id)
    }
  }, [wide, finished])

  useEffect(() => {
    const observer = new ResizeObserver(
      debounce(() => {
        setContainerRect(containerRef.current.getBoundingClientRect())
      })
    )
    observer.observe(containerRef.current)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <Layout
      left={
        <div ref={containerRef} className="xl:-mr-8">
          <AnimateSharedLayout>
            <motion.div
              layout={layout}
              className={`${styles.card} relative z-10 rounded-r-xl sm:rounded-xl shadow-xl text-black mx-auto`}
              initial={false}
              animate={
                containerRect?.width
                  ? {
                      width: !supportsMd || wide ? containerRect.width : 375,
                    }
                  : {}
              }
              transition={TRANSITION}
            >
              <motion.div
                layout={layout}
                transition={TRANSITION}
                className={clsx('bg-white rounded-r-xl sm:rounded-xl overflow-hidden', {
                  flex: step >= 8 && md,
                  'p-8': step >= 0,
                  'text-center': step >= 7,
                })}
              >
                <motion.div
                  layout={layout}
                  className={clsx(
                    'absolute z-20 top-1/2 left-0 text-black rounded-full -mt-4 -ml-4 pointer-events-none',
                    { invisible: !supportsMd }
                  )}
                  initial={{ opacity: 0 }}
                  animate={cursorControls}
                  transition={{ default: TRANSITION, opacity: { duration: 0.25 } }}
                >
                  <svg className="h-8 w-8" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="8"
                      fill="rgba(0, 0, 0, 0.5)"
                    />
                  </svg>
                </motion.div>
                <motion.div
                  layout={layout}
                  initial={false}
                  animate={{
                    ...((step >= 1 && step < 10) || (step >= 10 && !md && !finished)
                      ? { borderRadius: 64 }
                      : { borderRadius: 0 }),
                  }}
                  transition={TRANSITION}
                  className={clsx(
                    'relative z-10 overflow-hidden flex-none',
                    step >= 9 && md ? '-m-8 mr-8' : step >= 2 ? 'mx-auto mb-6' : 'mb-6',
                    step >= 11 && md ? 'w-48' : 'w-32',
                    step >= 12 && md ? 'h-auto' : 'h-32'
                  )}
                >
                  <motion.img
                    layout={layout}
                    transition={TRANSITION}
                    src={require('@/img/sarah-dayan.jpg').default}
                    alt=""
                    className={clsx(
                      'absolute max-w-none object-cover',
                      finished && !md ? 'rounded-full' : ''
                    )}
                    style={
                      finished
                        ? { top: 0, left: 0, width: '100%', height: '100%' }
                        : step >= 12 && md
                        ? fit(192, containerRect.height, 384, 512)
                        : step >= 11 && md
                        ? fit(192, 128, 384, 512)
                        : fit(128, 128, 384, 512)
                    }
                  />
                </motion.div>
                <motion.div layout={layout} transition={TRANSITION}>
                  <motion.div layout={layout} className="mb-4" transition={TRANSITION}>
                    <Words bolder={step >= 3} layout={layout} transition={TRANSITION}>
                      “Tailwind CSS is the only framework that I've seen scale on large teams. It’s
                      easy to customize, adapts to any design, and the build size is tiny.”
                    </Words>
                  </motion.div>
                  <motion.div
                    className={`flex flex-col ${step >= 7 ? 'items-center' : 'items-start'}`}
                    style={{
                      ...(step >= 4 ? { fontWeight: 500 } : { fontWeight: 400 }),
                    }}
                    transition={TRANSITION}
                  >
                    <motion.p
                      layout={layout}
                      initial={false}
                      animate={{
                        ...(step >= 5 ? { color: '#0891b2' } : { color: '#000' }),
                      }}
                      transition={TRANSITION}
                    >
                      Sarah Dayan
                    </motion.p>
                    <motion.p
                      layout={layout}
                      initial={false}
                      animate={{
                        ...(step >= 6 ? { color: '#71717a' } : { color: '#000' }),
                      }}
                      transition={TRANSITION}
                    >
                      Staff Engineer, Algolia
                    </motion.p>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </AnimateSharedLayout>
        </div>
      }
      right={
        <CodeWindow className="bg-lightBlue-500">
          <CodeWindow.Code
            tokens={tokens}
            tokenComponent={HeroToken}
            tokenProps={{
              currentGroup: state.group,
              currentChar: state.char,
              onCharComplete(charIndex) {
                setState((state) => ({ ...state, char: charIndex + 1 }))
              },
              async onGroupComplete(groupIndex) {
                setStep(groupIndex)

                if (groupIndex === 7) {
                  if (!supportsMd) return
                  await cursorControls.start({ opacity: 0.5, transition: { delay: 1 } })
                  setWide(true)
                  setIsMd(true)
                  await cursorControls.start({ opacity: 0, transition: { delay: 0.5 } })
                }

                if (ranges[groupIndex + 1] && ranges[groupIndex + 1].immediate) {
                  setState({ char: 0, group: groupIndex + 1 })
                } else {
                  window.setTimeout(() => {
                    setState({ char: 0, group: groupIndex + 1 })
                  }, GROUP_DELAY)
                }
              },
            }}
          />
        </CodeWindow>
      }
    />
  )
}

function AnimatedToken({ current, onComplete, children }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) {
      onComplete()
    }
  }, [visible])

  useEffect(() => {
    if (current) {
      window.setTimeout(() => {
        setVisible(true)
      }, CHAR_DELAY)
    }
  }, [current])

  return (
    <>
      <span className={visible ? undefined : 'hidden'}>{children}</span>
      {current && <span className="border -mx-px" style={{ height: '1.125rem' }} />}
    </>
  )
}

function HeroToken({ currentChar, onCharComplete, currentGroup, onGroupComplete, ...props }) {
  const { token } = props

  if (token[0].startsWith('char:')) {
    const [, groupIndex, indexInGroup] = token[0].split(':').map((x) => parseInt(x, 10))

    return (
      <AnimatedToken
        current={currentGroup === groupIndex && currentChar === indexInGroup}
        onComplete={() => {
          if (token[0].endsWith(':last')) {
            onGroupComplete(groupIndex)
          } else {
            onCharComplete(indexInGroup)
          }
        }}
        {...props}
      />
    )
  }

  return <Token {...props} />
}

function Layout({ left, right, pin = 'left' }) {
  return (
    <div className={`grid ${styles.layout}`}>
      <div
        className={`col-start-1 col-end-2 sm:col-start-2 sm:col-end-3 lg:col-start-1 lg:col-span-full row-start-1 row-span-full xl:col-start-1 xl:col-end-5 xl:row-start-2 xl:row-end-5 lg:py-10 xl:py-16 flex ${
          pin === 'left' ? '-ml-8 pr-4 sm:ml-0 sm:pr-0' : '-mr-8 pl-4 sm:mr-0 sm:pl-0'
        }`}
      >
        <div className="bg-gray-100 w-full flex-none rounded-2xl" />
        <div className="w-full flex-none -ml-full rounded-2xl transform shadow-lg bg-gradient-to-br from-turquoise-400 to-lightBlue-500 -rotate-1 sm:-rotate-2" />
      </div>
      <div
        className={`relative col-start-1 col-end-2 sm:col-start-2 sm:col-end-3 lg:col-start-1 lg:col-span-full xl:col-start-2 xl:col-end-3 row-start-2 row-end-3 xl:row-start-3 xl:row-end-4 self-center ${
          pin === 'left' ? 'pr-8' : 'pl-8'
        } sm:px-6 md:px-8 pb-6 md:pb-8 lg:px-0 lg:pb-0 -mt-16 lg:-mt-32 xl:mt-0`}
      >
        <div className="mx-auto max-w-3xl xl:max-w-none">
          <div
            className={`${styles.cardContainer} max-w-xl xl:max-w-none mx-auto lg:mr-0 flex items-center justify-center`}
          >
            <div className="w-full flex-none">{left}</div>
          </div>
        </div>
      </div>
      <div className="relative md:px-8 lg:px-0 col-start-1 col-span-full lg:col-start-1 xl:col-start-3 xl:col-end-4 row-start-1 row-end-2 xl:row-start-2 xl:row-end-5 self-center pt-8 lg:pt-0">
        <div className="mx-auto lg:max-w-3xl xl:max-w-none">
          <div className="lg:max-w-2xl xl:max-w-none">{right}</div>
        </div>
      </div>
    </div>
  )
}