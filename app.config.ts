export default defineAppConfig({
  ui: {
    colors: {
      primary: 'ink',
      neutral: 'stone'
    },
    button: {
      slots: {
        base: [
          'rounded-md font-normal inline-flex items-center',
          'transition-[transform,colors,box-shadow,background-color,opacity] duration-200 ease-out',
          'active:scale-[0.985] active:opacity-80'
        ].join(' ')
      },
      variants: {
        size: {
          sm: {
            base: 'px-3 py-1.5 text-sm gap-1.5'
          },
          md: {
            base: 'px-4 py-2 text-sm gap-1.5'
          },
          lg: {
            base: 'px-4 py-2.5 text-base gap-2'
          },
          xl: {
            base: 'px-5 py-3 text-base gap-2'
          }
        }
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: [
            'bg-[#1c1c1c] text-[#fcfbf8]',
            'shadow-[inset_0_0.5px_0_rgb(255_255_255_/_0.2),inset_0_0_0_0.5px_rgb(0_0_0_/_0.2),0_1px_2px_rgb(0_0_0_/_0.05)]',
            'hover:bg-[#1c1c1c]/90',
            'focus-visible:shadow-[0_4px_12px_rgb(0_0_0_/_0.1)]'
          ].join(' ')
        },
        {
          color: 'neutral',
          variant: 'solid',
          class: [
            'bg-[#1c1c1c] text-[#fcfbf8]',
            'shadow-[inset_0_0.5px_0_rgb(255_255_255_/_0.2),inset_0_0_0_0.5px_rgb(0_0_0_/_0.2),0_1px_2px_rgb(0_0_0_/_0.05)]'
          ].join(' ')
        },
        {
          color: 'neutral',
          variant: 'outline',
          class: 'ring-1 ring-[rgb(28_28_28_/_0.4)] bg-transparent hover:bg-[rgb(28_28_28_/_0.04)]'
        },
        {
          color: 'neutral',
          variant: 'ghost',
          class: 'hover:bg-[rgb(28_28_28_/_0.04)] active:bg-[rgb(28_28_28_/_0.06)]'
        },
        {
          color: 'neutral',
          variant: 'soft',
          class: 'bg-[rgb(28_28_28_/_0.04)] hover:bg-[rgb(28_28_28_/_0.07)] text-highlighted'
        },
        {
          color: 'primary',
          variant: 'soft',
          class: 'bg-[rgb(28_28_28_/_0.04)] hover:bg-[rgb(28_28_28_/_0.07)] text-highlighted'
        },
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring-1 ring-[rgb(28_28_28_/_0.4)] bg-transparent hover:bg-[rgb(28_28_28_/_0.04)]'
        }
      ]
    },
    input: {
      slots: {
        base: [
          'rounded-md',
          'transition-[box-shadow,background-color,border-color,ring-color] duration-200 ease-out',
          'placeholder:text-muted'
        ].join(' ')
      },
      variants: {
        size: {
          md: {
            base: 'px-3 py-2 text-sm gap-1.5'
          },
          lg: {
            base: 'px-3.5 py-2.5 text-base gap-2'
          }
        },
        variant: {
          outline: 'bg-[#f7f4ed] ring-[#eceae4] focus-visible:ring-2 focus-visible:ring-[rgb(59_130_246_/_0.45)]'
        }
      }
    },
    select: {
      slots: {
        base: [
          'rounded-md',
          'transition-[box-shadow,background-color,border-color,ring-color] duration-200 ease-out'
        ].join(' ')
      },
      variants: {
        size: {
          md: {
            base: 'px-3 py-2 text-sm gap-1.5'
          },
          lg: {
            base: 'px-3.5 py-2.5 text-base gap-2'
          }
        },
        variant: {
          outline: 'bg-[#f7f4ed] ring-[#eceae4] focus-visible:ring-2 focus-visible:ring-[rgb(59_130_246_/_0.45)]'
        }
      }
    },
    checkbox: {
      slots: {
        base: 'rounded-[4px] transition-[background-color,box-shadow,transform] duration-200',
        label: 'text-sm font-normal text-toned',
        description: 'text-xs text-muted'
      }
    },
    formField: {
      slots: {
        label: 'text-sm font-normal text-toned',
        description: 'text-xs text-muted',
        error: 'text-xs text-red-600'
      }
    }
  }
})
