#include <stdio.h>

int main()
{
    int num;
    float unit01, unit02, result01, result02, tk01, tk02;

    printf(" 1. Units to TK \n 2. TK to Units \n");

    printf("\n Enter Number: ");
    scanf("%d", &num);

    printf("\n\n =====> 0%d <===== \n\n", num);

    if(num == 1)
    {
        printf(" Used Unit: ");
        scanf("%f", &unit01);

        if(unit01 <= 50)
        {
            result01 = unit01 * 4.63;
            printf("\n => %f TK", result01);
        }
        else
        {
            unit02 = unit01 - 50;
            result02 = (50 * 4.63) + (unit02 * 7.20);
            printf("\n => %f TK", result02);
        }
    }


    else if(num == 2)
    {
        printf(" Used TK: ");
        scanf("%f", &tk01);
        if(tk01 <= 231.5)
        {
            result01 = tk01 / 4.63;
            printf("\n => %f Units", result01);
        }
        else
        {
            tk02 = tk01 - 231.5;
            result02 = (231.5 / 4.63) + (tk02 / 7.20);
            printf("\n => %f Units", result02);
        }
    }

    else
    {
        printf(" ERROR !!!!!! \n");
    }


    printf("\n\n\n\n\n");

    return 0;
}
